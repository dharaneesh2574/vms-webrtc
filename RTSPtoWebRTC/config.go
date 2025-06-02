// config.go
package main

import (
	"crypto/rand"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/deepch/vdk/av"
	"github.com/deepch/vdk/codec/h264parser"
)

// Config global
var Config = loadConfig()

// ConfigST struct
type ConfigST struct {
	mutex     sync.RWMutex
	Server    ServerST            `json:"server"`
	Streams   map[string]StreamST `json:"streams"`
	LastError error               `json:"-"`
}

// ServerST struct
type ServerST struct {
	HTTPPort      string   `json:"http_port"`
	ICEServers    []string `json:"ice_servers"`
	ICEUsername   string   `json:"ice_username"`
	ICECredential string   `json:"ice_credential"`
	WebRTCPortMin uint16   `json:"webrtc_port_min"`
	WebRTCPortMax uint16   `json:"webrtc_port_max"`
}

// StreamST struct
type StreamST struct {
	Name         string            `json:"name"`
	URL          string            `json:"url"`
	Status       bool              `json:"status"`
	OnDemand     bool              `json:"on_demand"`
	DisableAudio bool              `json:"disable_audio"`
	Debug        bool              `json:"debug"`
	RunLock      bool              `json:"-"`
	Codecs       []av.CodecData    `json:"-"`
	Cl           map[string]viewer `json:"-"`
}

type viewer struct {
	c chan av.Packet
}

func (element *ConfigST) RunIFNotRun(uuid string) {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	if tmp, ok := element.Streams[uuid]; ok {
		if tmp.OnDemand && !tmp.RunLock {
			tmp.RunLock = true
			tmp.Status = false // Start as false, will be set to true when codecs are ready
			tmp.Codecs = nil   // Clear old codecs to ensure fresh discovery
			element.Streams[uuid] = tmp
			log.Println("Starting on-demand stream", uuid)
			go RTSPWorkerLoop(uuid, tmp.URL, tmp.OnDemand, tmp.DisableAudio, tmp.Debug)
		} else if !tmp.OnDemand && !tmp.RunLock {
			tmp.RunLock = true
			tmp.Status = false // Start as false, will be set to true when codecs are ready
			tmp.Codecs = nil   // Clear old codecs to ensure fresh discovery
			element.Streams[uuid] = tmp
			log.Println("Starting non-on-demand stream", uuid)
			go RTSPWorkerLoop(uuid, tmp.URL, tmp.OnDemand, tmp.DisableAudio, tmp.Debug)
		} else {
			log.Println("Stream", uuid, "already running or conditions not met. RunLock:", tmp.RunLock, "OnDemand:", tmp.OnDemand)
		}
	} else {
		log.Println("Stream", uuid, "not found in config")
	}
}

func (element *ConfigST) RunUnlock(uuid string) {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	if tmp, ok := element.Streams[uuid]; ok {
		tmp.RunLock = false
		tmp.Status = false
		tmp.Codecs = nil // Clear codecs when stream stops
		element.Streams[uuid] = tmp
		log.Println("Stopped stream", uuid, "and cleared codecs")
	} else {
		log.Println("Stream", uuid, "not found for unlocking")
	}
}

func (element *ConfigST) HasViewer(uuid string) bool {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	if tmp, ok := element.Streams[uuid]; ok && len(tmp.Cl) > 0 {
		log.Println("Stream", uuid, "has", len(tmp.Cl), "viewers")
		return true
	}
	log.Println("Stream", uuid, "has no viewers")
	return false
}

func (element *ConfigST) GetICEServers() []string {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	return element.Server.ICEServers
}

func (element *ConfigST) GetICEUsername() string {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	return element.Server.ICEUsername
}

func (element *ConfigST) GetICECredential() string {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	return element.Server.ICECredential
}

func (element *ConfigST) GetWebRTCPortMin() uint16 {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	return element.Server.WebRTCPortMin
}

func (element *ConfigST) GetWebRTCPortMax() uint16 {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	return element.Server.WebRTCPortMax
}

func loadConfig() *ConfigST {
	var tmp ConfigST
	data, err := os.ReadFile("config.json")
	if err == nil {
		err = json.Unmarshal(data, &tmp)
		if err != nil {
			log.Fatalln(err)
		}
		for i, v := range tmp.Streams {
			if v.Name == "" {
				v.Name = i // Fallback to URL if name is not set
			}
			v.Cl = make(map[string]viewer)
			tmp.Streams[i] = v
		}
		log.Printf("Loaded config from config.json: Server=%+v, Streams=%d", tmp.Server, len(tmp.Streams))
	} else {
		log.Println("config.json not found, using default configuration")
		addr := flag.String("listen", "8083", "HTTP host:port")
		udpMin := flag.Int("udp_min", 0, "WebRTC UDP port min")
		udpMax := flag.Int("udp_max", 0, "WebRTC UDP port max")
		iceServer := flag.String("ice_server", "", "ICE Server")
		flag.Parse()

		tmp.Server.HTTPPort = *addr
		tmp.Server.WebRTCPortMin = uint16(*udpMin)
		tmp.Server.WebRTCPortMax = uint16(*udpMax)
		if len(*iceServer) > 0 {
			tmp.Server.ICEServers = []string{*iceServer}
		}

		tmp.Streams = make(map[string]StreamST)
	}
	return &tmp
}

// InitializeAllStreams starts all streams to discover their codecs
func (element *ConfigST) InitializeAllStreams() {
	time.Sleep(1 * time.Second) // Give the server time to start
	element.mutex.RLock()
	streamIDs := make([]string, 0, len(element.Streams))
	for streamID := range element.Streams {
		streamIDs = append(streamIDs, streamID)
	}
	element.mutex.RUnlock()

	for _, streamID := range streamIDs {
		log.Println("Initializing stream for codec discovery:", streamID)
		element.RunIFNotRun(streamID)
	}
}

func (element *ConfigST) cast(uuid string, pck av.Packet) {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	if tmp, ok := element.Streams[uuid]; ok {
		if !tmp.Status {
			tmp.Status = true
			element.Streams[uuid] = tmp
			log.Println("Set status to true for stream", uuid, "due to packet casting")
		}
		for _, v := range tmp.Cl {
			if len(v.c) < cap(v.c) {
				v.c <- pck
			} else {
				log.Println("Client channel full for stream", uuid, "dropping packet")
			}
		}
	} else {
		log.Println("Stream", uuid, "not found for casting packet")
	}
}

func (element *ConfigST) ext(suuid string) bool {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	_, ok := element.Streams[suuid]
	if ok {
		log.Println("Stream", suuid, "exists")
	} else {
		log.Println("Stream", suuid, "does not exist")
	}
	return ok
}

func (element *ConfigST) coAd(suuid string, codecs []av.CodecData) {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	if tmp, ok := element.Streams[suuid]; ok {
		tmp.Codecs = codecs
		if !tmp.Status {
			tmp.Status = true
			log.Println("Set status to true for stream", suuid, "due to codec update")
		}
		element.Streams[suuid] = tmp
		log.Println("Added codecs for stream", suuid, codecs)
	} else {
		log.Println("Stream", suuid, "not found for adding codecs")
	}
}

func (element *ConfigST) coGe(suuid string) []av.CodecData {
	// Check if stream is running, if not and it's on-demand, try to start it
	element.mutex.RLock()
	tmp, ok := element.Streams[suuid]
	element.mutex.RUnlock()

	if !ok {
		log.Println("Stream", suuid, "not found for getting codecs")
		return nil
	}

	// If stream is not running and is on-demand, start it
	if !tmp.RunLock && tmp.OnDemand {
		log.Println("On-demand stream", suuid, "not running, starting it")
		element.RunIFNotRun(suuid)
	}

	// Wait for codecs with extended timeout for restarted streams
	maxRetries := 200 // Extended from 100 to 200 (10 seconds)
	for i := 0; i < maxRetries; i++ {
		element.mutex.RLock()
		tmp, ok := element.Streams[suuid]
		element.mutex.RUnlock()

		if !ok {
			log.Println("Stream", suuid, "not found for getting codecs")
			return nil
		}

		if tmp.Codecs != nil {
			for _, codec := range tmp.Codecs {
				if codec.Type() == av.H264 {
					codecVideo := codec.(h264parser.CodecData)
					if codecVideo.SPS() != nil && codecVideo.PPS() != nil && len(codecVideo.SPS()) > 0 && len(codecVideo.PPS()) > 0 {
						log.Println("Valid H.264 codec for stream", suuid)
					} else {
						log.Println("Bad H.264 codec SPS or PPS for stream", suuid, "waiting")
						time.Sleep(50 * time.Millisecond)
						continue
					}
				}
			}
			log.Println("Returning codecs for stream", suuid)
			return tmp.Codecs
		}

		// Log progress every 2 seconds (40 iterations)
		if i%40 == 0 && i > 0 {
			log.Printf("Still waiting for codecs for stream %s (attempt %d/%d, RunLock: %v, Status: %v)",
				suuid, i, maxRetries, tmp.RunLock, tmp.Status)
		}

		time.Sleep(50 * time.Millisecond)
	}
	log.Println("Failed to get codecs for stream", suuid, "after", maxRetries, "retries")
	return nil
}

func (element *ConfigST) clAd(suuid string) (string, chan av.Packet) {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	if tmp, ok := element.Streams[suuid]; ok {
		cuuid := pseudoUUID()
		ch := make(chan av.Packet, 100)
		tmp.Cl[cuuid] = viewer{c: ch}
		element.Streams[suuid] = tmp
		log.Println("Added client", cuuid, "to stream", suuid)
		return cuuid, ch
	}
	log.Println("Stream", suuid, "not found for adding client")
	return "", nil
}

func (element *ConfigST) list() (string, []string) {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	var res []string
	var first string
	for k := range element.Streams {
		if first == "" {
			first = k
		}
		res = append(res, k)
	}
	log.Println("Listing streams:", res)
	return first, res
}

func (element *ConfigST) clDe(suuid, cuuid string) {
	element.mutex.Lock()
	defer element.mutex.Unlock()
	if tmp, ok := element.Streams[suuid]; ok {
		delete(tmp.Cl, cuuid)
		element.Streams[suuid] = tmp
		log.Println("Removed client", cuuid, "from stream", suuid, "- remaining viewers:", len(tmp.Cl))

		if len(tmp.Cl) == 0 && tmp.OnDemand {
			log.Println("No more viewers for on-demand stream", suuid, "- will stop when worker loop detects this")
			// Don't manually stop here, let the worker loop handle it naturally
		}
	} else {
		log.Println("Stream", suuid, "not found for removing client", cuuid)
	}
}

func pseudoUUID() (uuid string) {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		log.Println("Error generating UUID:", err)
		return
	}
	uuid = fmt.Sprintf("%X-%X-%X-%X-%X", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
	return
}
