package main

import (
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"runtime/debug"
	"sort"
	"strings"
	"time"

	"github.com/deepch/vdk/av"
	webrtc "github.com/deepch/vdk/format/webrtcv3"
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, ngrok-skip-browser-warning")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

type JCodec struct {
	Type string
}

func serveHTTP() {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()
	router.Use(CORSMiddleware())

	if _, err := os.Stat("./web"); !os.IsNotExist(err) {
		router.LoadHTMLGlob("web/templates/*")
		router.GET("/", HTTPAPIServerIndex)
		router.GET("/stream/player/:uuid", HTTPAPIServerStreamPlayer)
	}
	router.GET("/api/streams", func(c *gin.Context) {
		Config.mutex.Lock()
		defer Config.mutex.Unlock()
		c.JSON(http.StatusOK, gin.H{"streams": Config.Streams})
	})
	router.GET("/stream/info/:uuid", HTTPAPIServerStreamInfo)
	router.POST("/stream/receiver/:uuid", HTTPAPIServerStreamWebRTC)
	router.GET("/stream/codec/:uuid", HTTPAPIServerStreamCodec)
	router.POST("/stream", HTTPAPIServerStreamWebRTC2)
	router.POST("/api/streams", HTTPAPIAddStream)
	router.PUT("/api/stream/:uuid", HTTPAPIUpdateStream)
	router.DELETE("/api/stream/:uuid", HTTPAPIDeleteStream)

	router.StaticFS("/static", http.Dir("web/static"))
	err := router.Run(Config.Server.HTTPPort)
	if err != nil {
		log.Fatalln("Start HTTP Server error", err)
	}
}

func HTTPAPIServerIndex(c *gin.Context) {
	_, all := Config.list()
	if len(all) > 0 {
		c.Header("Cache-Control", "no-cache, max-age=0, must-revalidate, no-store")
		c.Header("Access-Control-Allow-Origin", "http://localhost:5173")
		c.Redirect(http.StatusMovedPermanently, "stream/player/"+all[0])
	} else {
		c.HTML(http.StatusOK, "index.tmpl", gin.H{
			"port":    Config.Server.HTTPPort,
			"version": time.Now().String(),
		})
	}
}

func HTTPAPIServerStreamPlayer(c *gin.Context) {
	_, all := Config.list()
	sort.Strings(all)
	c.HTML(http.StatusOK, "player.tmpl", gin.H{
		"port":     Config.Server.HTTPPort,
		"suuid":    c.Param("uuid"),
		"suuidMap": all,
		"version":  time.Now().String(),
	})
}

func HTTPAPIServerStreamInfo(c *gin.Context) {
	uuid := c.Param("uuid")
	log.Println("Fetching stream info for", uuid)
	Config.mutex.Lock()
	defer Config.mutex.Unlock()
	if stream, ok := Config.Streams[uuid]; ok {
		c.JSON(http.StatusOK, gin.H{
			"uuid":     uuid,
			"url":      stream.URL,
			"onDemand": stream.OnDemand,
			"status":   stream.Status,
		})
	} else {
		log.Println("Stream not found for info request", uuid)
		c.String(http.StatusNotFound, "Stream not found")
	}
}

func HTTPAPIServerStreamCodec(c *gin.Context) {
	uuid := c.Param("uuid")
	log.Println("Fetching codecs for stream", uuid)
	if Config.ext(uuid) {
		Config.RunIFNotRun(uuid)
		codecs := Config.coGe(uuid)
		if codecs == nil {
			log.Println("No codecs found for stream", uuid)
			c.String(http.StatusInternalServerError, "No codecs found")
			return
		}
		var tmpCodec []JCodec
		for _, codec := range codecs {
			if codec.Type() != av.H264 && codec.Type() != av.PCM_ALAW && codec.Type() != av.PCM_MULAW && codec.Type() != av.OPUS {
				log.Println("Codec Not Supported WebRTC ignore this track", codec.Type())
				continue
			}
			if codec.Type().IsVideo() {
				tmpCodec = append(tmpCodec, JCodec{Type: "video"})
			} else {
				tmpCodec = append(tmpCodec, JCodec{Type: "audio"})
			}
		}
		b, err := json.Marshal(tmpCodec)
		if err != nil {
			log.Println("Failed to marshal codecs for stream", uuid, err)
			c.String(http.StatusInternalServerError, "Failed to marshal codecs")
			return
		}
		log.Println("Returning codecs for stream", uuid, string(b))
		c.Header("Content-Type", "application/json") // Explicitly set Content-Type
		_, err = c.Writer.Write(b)
		if err != nil {
			log.Println("Write Codec Info error for stream", uuid, err)
			return
		}
	} else {
		log.Println("Stream not found for codec request", uuid)
		c.String(http.StatusNotFound, "Stream not found")
	}
}

func HTTPAPIServerStreamWebRTC(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			log.Println("Panic in HTTPAPIServerStreamWebRTC:", r)
			log.Println("Stack trace:", string(debug.Stack()))
			c.String(http.StatusInternalServerError, "Internal Server Error")
		}
	}()

	suuid := c.Param("uuid")
	log.Println("WebRTC request for stream", suuid)
	if !Config.ext(suuid) {
		log.Println("Stream Not Found", suuid)
		c.String(http.StatusNotFound, "Stream Not Found")
		return
	}
	Config.RunIFNotRun(suuid)
	codecs := Config.coGe(suuid)
	if codecs == nil {
		log.Println("Stream Codec Not Found for", suuid)
		c.String(http.StatusInternalServerError, "Stream Codec Not Found")
		return
	}
	log.Println("Codecs retrieved for stream", suuid)
	for i, codec := range codecs {
		log.Printf("Codec %d: Type=%v, IsVideo=%v", i, codec.Type(), codec.Type().IsVideo())
	}

	var AudioOnly bool
	if len(codecs) == 1 && codecs[0].Type().IsAudio() {
		AudioOnly = true
		log.Println("Stream is audio-only", suuid)
	}

	muxerWebRTC := webrtc.NewMuxer(webrtc.Options{
		ICEServers:    Config.GetICEServers(),
		ICEUsername:   Config.GetICEUsername(),
		ICECredential: Config.GetICECredential(),
		PortMin:       Config.GetWebRTCPortMin(),
		PortMax:       Config.GetWebRTCPortMax(),
	})

	sdpOffer := c.PostForm("data")
	log.Println("Received raw SDP offer for stream", suuid, sdpOffer)

	answer, err := muxerWebRTC.WriteHeader(codecs, sdpOffer)
	if err != nil {
		if err.Error() == "illegal base64 data at input byte 1" {
			log.Println("Retrying with base64-encoded SDP for stream", suuid)
			encodedSDPOffer := base64.StdEncoding.EncodeToString([]byte(sdpOffer))
			answer, err = muxerWebRTC.WriteHeader(codecs, encodedSDPOffer)
			if err != nil {
				log.Println("WriteHeader error with base64-encoded SDP for stream", suuid, err)
				c.String(http.StatusInternalServerError, "WriteHeader Error with base64-encoded SDP: "+err.Error())
				return
			}
		} else {
			log.Println("WriteHeader error for stream", suuid, err)
			c.String(http.StatusInternalServerError, "WriteHeader Error: "+err.Error())
			return
		}
	}

	log.Println("Sending SDP answer for stream", suuid, answer)
	c.Writer.Header().Set("Content-Type", "text/plain")
	_, err = c.Writer.Write([]byte(answer))
	if err != nil {
		log.Println("Write error for stream", suuid, err)
		return
	}

	go func() {
		cid, ch := Config.clAd(suuid)
		defer Config.clDe(suuid, cid)
		defer muxerWebRTC.Close()
		log.Println("Starting WebRTC stream for", suuid, "with client ID", cid)
		var videoStart bool
		noVideo := time.NewTimer(10 * time.Second)
		for {
			select {
			case <-noVideo.C:
				log.Println("No video received for stream", suuid, "within 10 seconds")
				return
			case pck := <-ch:
				if pck.IsKeyFrame || AudioOnly {
					noVideo.Reset(10 * time.Second)
					videoStart = true
					log.Println("Received key frame or audio packet for stream", suuid)
				}
				if !videoStart && !AudioOnly {
					continue
				}
				err = muxerWebRTC.WritePacket(pck)
				if err != nil {
					log.Println("WritePacket error for stream", suuid, err)
					return
				}
			}
		}
	}()
}

type Response struct {
	Tracks []string `json:"tracks"`
	Sdp64  string   `json:"sdp64"`
}

type ResponseError struct {
	Error string `json:"error"`
}

// Add helper function to normalize RTSP URL
func normalizeRTSPURL(inputURL string) string {
	// Parse the URL
	u, err := url.Parse(inputURL)
	if err != nil {
		return inputURL // Return original if parsing fails
	}

	// Ensure scheme is lowercase
	u.Scheme = strings.ToLower(u.Scheme)

	// Remove any trailing slashes
	u.Path = strings.TrimRight(u.Path, "/")

	// Sort query parameters if any
	if u.RawQuery != "" {
		params := u.Query()
		if len(params) > 0 {
			// Create a sorted slice of parameter keys
			keys := make([]string, 0, len(params))
			for k := range params {
				keys = append(keys, k)
			}
			sort.Strings(keys)

			// Build sorted query string
			query := url.Values{}
			for _, k := range keys {
				query[k] = params[k]
			}
			u.RawQuery = query.Encode()
		}
	}

	return u.String()
}

// Add helper function to find existing stream by URL
func findExistingStreamByURL(normalizedURL string) (string, bool) {
	Config.mutex.Lock()
	defer Config.mutex.Unlock()

	for id, stream := range Config.Streams {
		if normalizeRTSPURL(stream.URL) == normalizedURL {
			return id, true
		}
	}
	return "", false
}

func HTTPAPIServerStreamWebRTC2(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			log.Println("Panic in HTTPAPIServerStreamWebRTC2:", r)
			log.Println("Stack trace:", string(debug.Stack()))
			c.JSON(http.StatusInternalServerError, ResponseError{Error: "Internal Server Error"})
		}
	}()

	url := c.PostForm("url")
	normalizedURL := normalizeRTSPURL(url)
	log.Printf("Received WebRTC2 request for URL: %s (normalized: %s)", url, normalizedURL)

	// Check if stream already exists with normalized URL
	if existingID, found := findExistingStreamByURL(normalizedURL); found {
		log.Printf("Found existing stream with ID %s for URL %s", existingID, url)
		url = existingID // Use existing stream ID
	} else {
		// Only add new stream if it doesn't exist
		Config.mutex.Lock()
		Config.Streams[normalizedURL] = StreamST{
			URL:      url, // Keep original URL for connection
			Name:     url,
			OnDemand: true,
			Cl:       make(map[string]viewer),
		}
		Config.mutex.Unlock()
		log.Printf("Added new stream to config: %s", normalizedURL)
		url = normalizedURL // Use normalized URL as stream ID
	}

	Config.RunIFNotRun(url)

	codecs := Config.coGe(url)
	if codecs == nil {
		log.Println("Stream Codec Not Found for", url)
		c.JSON(500, ResponseError{Error: Config.LastError.Error()})
		return
	}
	log.Println("Codecs retrieved for stream", url)
	for i, codec := range codecs {
		log.Printf("Codec %d: Type=%v, IsVideo=%v", i, codec.Type(), codec.Type().IsVideo())
	}

	muxerWebRTC := webrtc.NewMuxer(
		webrtc.Options{
			ICEServers: Config.GetICEServers(),
			PortMin:    Config.GetWebRTCPortMin(),
			PortMax:    Config.GetWebRTCPortMax(),
		},
	)

	sdp64 := c.PostForm("sdp64")
	log.Println("Received SDP offer for stream", url, sdp64)
	answer, err := muxerWebRTC.WriteHeader(codecs, sdp64)
	if err != nil {
		log.Println("Muxer WriteHeader error for stream", url, err)
		c.JSON(500, ResponseError{Error: err.Error()})
		return
	}

	response := Response{
		Sdp64: answer,
	}

	for _, codec := range codecs {
		if codec.Type() != av.H264 &&
			codec.Type() != av.PCM_ALAW &&
			codec.Type() != av.PCM_MULAW &&
			codec.Type() != av.OPUS {
			log.Println("Codec Not Supported WebRTC ignore this track", codec.Type())
			continue
		}
		if codec.Type().IsVideo() {
			response.Tracks = append(response.Tracks, "video")
		} else {
			response.Tracks = append(response.Tracks, "audio")
		}
	}

	log.Println("Sending WebRTC2 response for stream", url, response)
	c.JSON(200, response)

	AudioOnly := len(codecs) == 1 && codecs[0].Type().IsAudio()

	go func() {
		cid, ch := Config.clAd(url)
		defer Config.clDe(url, cid)
		defer muxerWebRTC.Close()
		log.Println("Starting WebRTC2 stream for", url, "with client ID", cid)
		var videoStart bool
		noVideo := time.NewTimer(10 * time.Second)
		for {
			select {
			case <-noVideo.C:
				log.Println("No video received for stream", url, "within 10 seconds")
				return
			case pck := <-ch:
				if pck.IsKeyFrame || AudioOnly {
					noVideo.Reset(10 * time.Second)
					videoStart = true
					log.Println("Received key frame or audio packet for stream", url)
				}
				if !videoStart && !AudioOnly {
					continue
				}
				err = muxerWebRTC.WritePacket(pck)
				if err != nil {
					log.Println("WritePacket error for stream", url, err)
					return
				}
			}
		}
	}()
}

func HTTPAPIAddStream(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			log.Println("Panic in HTTPAPIAddStream:", r)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		}
	}()

	var newStream struct {
		Name         string `json:"name"`
		URL          string `json:"url"`
		OnDemand     bool   `json:"on_demand"`
		DisableAudio bool   `json:"disable_audio"`
		Debug        bool   `json:"debug"`
	}
	log.Println("Received POST /api/streams request")
	if err := c.ShouldBindJSON(&newStream); err != nil {
		log.Println("Invalid request body:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	log.Println("Parsed stream data:", newStream)

	Config.mutex.Lock()
	defer Config.mutex.Unlock()

	if _, exists := Config.Streams[newStream.URL]; exists {
		log.Println("Stream already exists:", newStream.URL)
		c.JSON(http.StatusConflict, gin.H{"error": "Stream with this URL already exists"})
		return
	}

	Config.Streams[newStream.URL] = StreamST{
		URL:          newStream.URL,
		Name:         newStream.Name,
		OnDemand:     newStream.OnDemand,
		DisableAudio: newStream.DisableAudio,
		Debug:        newStream.Debug,
		Status:       false,
		Cl:           make(map[string]viewer),
	}
	log.Println("Added stream to config:", newStream.URL)

	if err := saveConfig(); err != nil {
		log.Println("Failed to save config:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save config"})
		return
	}
	log.Println("Saved config successfully for stream:", newStream.URL)

	// Initialize stream to fetch codecs and status
	Config.RunIFNotRun(newStream.URL)
	log.Println("Initialized stream:", newStream.URL)

	c.JSON(http.StatusOK, gin.H{
		"id":     newStream.URL,
		"name":   newStream.Name,
		"url":    newStream.URL,
		"status": Config.Streams[newStream.URL].Status,
	})
}

func HTTPAPIUpdateStream(c *gin.Context) {
	uuid := c.Param("uuid")
	var updatedStream struct {
		Name         string `json:"name"`
		URL          string `json:"url"`
		OnDemand     bool   `json:"on_demand"`
		DisableAudio bool   `json:"disable_audio"`
		Debug        bool   `json:"debug"`
	}
	if err := c.ShouldBindJSON(&updatedStream); err != nil {
		log.Println("Invalid request body:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	Config.mutex.Lock()
	defer Config.mutex.Unlock()

	if stream, exists := Config.Streams[uuid]; exists {
		if updatedStream.URL != uuid {
			if _, exists := Config.Streams[updatedStream.URL]; exists {
				c.JSON(http.StatusConflict, gin.H{"error": "Stream with this URL already exists"})
				return
			}
			delete(Config.Streams, uuid)
		}

		Config.Streams[updatedStream.URL] = StreamST{
			URL:          updatedStream.URL,
			Name:         updatedStream.Name,
			OnDemand:     updatedStream.OnDemand,
			DisableAudio: updatedStream.DisableAudio,
			Debug:        updatedStream.Debug,
			Status:       stream.Status,
			RunLock:      stream.RunLock,
			Codecs:       stream.Codecs,
			Cl:           stream.Cl,
		}

		if err := saveConfig(); err != nil {
			log.Println("Failed to save config:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save config"})
			return
		}

		log.Println("Updated stream:", updatedStream.URL)
		c.JSON(http.StatusOK, gin.H{
			"id":     updatedStream.URL,
			"name":   updatedStream.Name,
			"url":    updatedStream.URL,
			"status": stream.Status,
		})
	} else {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stream not found"})
	}
}

func HTTPAPIDeleteStream(c *gin.Context) {
	uuid := c.Param("uuid")
	Config.mutex.Lock()
	defer Config.mutex.Unlock()

	if _, exists := Config.Streams[uuid]; exists {
		delete(Config.Streams, uuid)
		if err := saveConfig(); err != nil {
			log.Println("Failed to save config:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save config"})
			return
		}
		log.Println("Deleted stream:", uuid)
		c.JSON(http.StatusOK, gin.H{"message": "Stream deleted successfully"})
	} else {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stream not found"})
	}
}

func saveConfig() error {
	defer func() {
		if r := recover(); r != nil {
			log.Println("Panic in saveConfig:", r)
		}
	}()
	log.Println("Marshaling config")
	data, err := json.MarshalIndent(&Config, "", "  ")
	if err != nil {
		log.Println("Failed to marshal config:", err)
		return err
	}
	log.Println("Writing config to config.json")
	err = os.WriteFile("config.json", data, 0644)
	if err != nil {
		log.Println("Failed to write config file:", err)
		return err
	}
	log.Println("Config file written successfully")
	return nil
}
