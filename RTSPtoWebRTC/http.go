package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"sort"
	"time"

	"github.com/deepch/vdk/av"

	webrtc "github.com/deepch/vdk/format/webrtcv3"
	"github.com/gin-gonic/gin"
)

type JCodec struct {
	Type string
}

// API request/response types
type StreamRequest struct {
	Name         string `json:"name"`
	URL          string `json:"url"`
	OnDemand     bool   `json:"on_demand"`
	DisableAudio bool   `json:"disable_audio"`
	Debug        bool   `json:"debug"`
}

type StreamResponse struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	URL          string `json:"url"`
	Status       bool   `json:"status"`
	OnDemand     bool   `json:"on_demand"`
	DisableAudio bool   `json:"disable_audio"`
	Debug        bool   `json:"debug"`
}

type StreamsResponse struct {
	Streams map[string]StreamResponse `json:"streams"`
}

type StreamInfoResponse struct {
	UUID     string `json:"uuid"`
	URL      string `json:"url"`
	OnDemand bool   `json:"onDemand"`
	Status   string `json:"status"`
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
	router.POST("/stream/receiver/:uuid", HTTPAPIServerStreamWebRTC)
	router.GET("/stream/codec/:uuid", HTTPAPIServerStreamCodec)
	router.POST("/stream", HTTPAPIServerStreamWebRTC2)

	// New REST API endpoints for stream management
	router.GET("/api/streams", HTTPAPIServerListStreams)
	router.POST("/api/streams", HTTPAPIServerAddStream)
	router.PUT("/api/stream/:id", HTTPAPIServerUpdateStream)
	router.DELETE("/api/stream/:id", HTTPAPIServerDeleteStream)
	router.GET("/stream/info/:id", HTTPAPIServerStreamInfo)

	router.StaticFS("/static", http.Dir("web/static"))
	err := router.Run(Config.Server.HTTPPort)
	if err != nil {
		log.Fatalln("Start HTTP Server error", err)
	}
}

// HTTPAPIServerIndex  index
func HTTPAPIServerIndex(c *gin.Context) {
	_, all := Config.list()
	if len(all) > 0 {
		c.Header("Cache-Control", "no-cache, max-age=0, must-revalidate, no-store")
		c.Header("Access-Control-Allow-Origin", "*")
		c.Redirect(http.StatusMovedPermanently, "stream/player/"+all[0])
	} else {
		c.HTML(http.StatusOK, "index.tmpl", gin.H{
			"port":    Config.Server.HTTPPort,
			"version": time.Now().String(),
		})
	}
}

// HTTPAPIServerStreamPlayer stream player
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

// HTTPAPIServerStreamCodec stream codec
func HTTPAPIServerStreamCodec(c *gin.Context) {
	if Config.ext(c.Param("uuid")) {
		Config.RunIFNotRun(c.Param("uuid"))
		codecs := Config.coGe(c.Param("uuid"))
		if codecs == nil {
			c.JSON(404, ResponseError{Error: "No codecs found"})
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
		c.JSON(200, tmpCodec)
	} else {
		c.JSON(404, ResponseError{Error: "Stream not found"})
	}
}

// HTTPAPIServerStreamWebRTC stream video over WebRTC
func HTTPAPIServerStreamWebRTC(c *gin.Context) {
	if !Config.ext(c.PostForm("suuid")) {
		log.Println("Stream Not Found")
		return
	}
	Config.RunIFNotRun(c.PostForm("suuid"))
	codecs := Config.coGe(c.PostForm("suuid"))
	if codecs == nil {
		log.Println("Stream Codec Not Found")
		return
	}
	var AudioOnly bool
	if len(codecs) == 1 && codecs[0].Type().IsAudio() {
		AudioOnly = true
	}
	muxerWebRTC := webrtc.NewMuxer(webrtc.Options{ICEServers: Config.GetICEServers(), ICEUsername: Config.GetICEUsername(), ICECredential: Config.GetICECredential(), PortMin: Config.GetWebRTCPortMin(), PortMax: Config.GetWebRTCPortMax()})
	answer, err := muxerWebRTC.WriteHeader(codecs, c.PostForm("data"))
	if err != nil {
		log.Println("WriteHeader", err)
		return
	}
	_, err = c.Writer.Write([]byte(answer))
	if err != nil {
		log.Println("Write", err)
		return
	}
	go func() {
		cid, ch := Config.clAd(c.PostForm("suuid"))
		defer Config.clDe(c.PostForm("suuid"), cid)
		defer muxerWebRTC.Close()
		var videoStart bool
		noVideo := time.NewTimer(10 * time.Second)
		for {
			select {
			case <-noVideo.C:
				log.Println("noVideo")
				return
			case pck := <-ch:
				if pck.IsKeyFrame || AudioOnly {
					noVideo.Reset(10 * time.Second)
					videoStart = true
				}
				if !videoStart && !AudioOnly {
					continue
				}
				err = muxerWebRTC.WritePacket(pck)
				if err != nil {
					log.Println("WritePacket", err)
					return
				}
			}
		}
	}()
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Allow all origins
		c.Header("Access-Control-Allow-Origin", "*")

		// Cannot use credentials with wildcard origin for security reasons
		// Set to false to allow wildcard origin
		c.Header("Access-Control-Allow-Credentials", "false")

		// Allow common headers including ngrok-skip-browser-warning
		c.Header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-access-token, ngrok-skip-browser-warning")

		// Expose necessary headers
		c.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Cache-Control, Content-Language, Content-Type")

		// Allow all HTTP methods including DELETE
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")

		// Handle preflight OPTIONS requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

type Response struct {
	Tracks []string `json:"tracks"`
	Sdp64  string   `json:"sdp64"`
}

type ResponseError struct {
	Error string `json:"error"`
}

func HTTPAPIServerStreamWebRTC2(c *gin.Context) {
	streamID := c.PostForm("url") // This is actually the stream ID/name now, not the URL

	// Check if stream exists in configuration
	if _, exists := Config.Streams[streamID]; !exists {
		log.Printf("Stream %s not found in configuration", streamID)
		c.JSON(404, ResponseError{Error: "Stream not found in configuration"})
		return
	}

	Config.RunIFNotRun(streamID)

	codecs := Config.coGe(streamID)
	if codecs == nil {
		log.Println("Stream Codec Not Found")
		c.JSON(500, ResponseError{Error: Config.LastError.Error()})
		return
	}

	muxerWebRTC := webrtc.NewMuxer(
		webrtc.Options{
			ICEServers: Config.GetICEServers(),
			PortMin:    Config.GetWebRTCPortMin(),
			PortMax:    Config.GetWebRTCPortMax(),
		},
	)

	sdp64 := c.PostForm("sdp64")
	answer, err := muxerWebRTC.WriteHeader(codecs, sdp64)
	if err != nil {
		log.Println("Muxer WriteHeader", err)
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

	c.JSON(200, response)

	AudioOnly := len(codecs) == 1 && codecs[0].Type().IsAudio()

	go func() {
		cid, ch := Config.clAd(streamID)
		defer Config.clDe(streamID, cid)
		defer muxerWebRTC.Close()
		var videoStart bool
		noVideo := time.NewTimer(10 * time.Second)
		for {
			select {
			case <-noVideo.C:
				log.Println("noVideo")
				return
			case pck := <-ch:
				if pck.IsKeyFrame || AudioOnly {
					noVideo.Reset(10 * time.Second)
					videoStart = true
				}
				if !videoStart && !AudioOnly {
					continue
				}
				err = muxerWebRTC.WritePacket(pck)
				if err != nil {
					log.Println("WritePacket", err)
					return
				}
			}
		}
	}()
}

// HTTPAPIServerListStreams lists all configured streams
func HTTPAPIServerListStreams(c *gin.Context) {
	streams := make(map[string]StreamResponse)

	for id, stream := range Config.Streams {
		streams[id] = StreamResponse{
			ID:           id,
			Name:         id, // Using ID as name if no specific name field
			URL:          stream.URL,
			Status:       Config.ext(id), // Check if stream exists and is running
			OnDemand:     stream.OnDemand,
			DisableAudio: stream.DisableAudio,
			Debug:        stream.Debug,
		}
	}

	response := StreamsResponse{
		Streams: streams,
	}

	c.JSON(200, response)
}

// HTTPAPIServerAddStream adds a new stream configuration
func HTTPAPIServerAddStream(c *gin.Context) {
	var req StreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, ResponseError{Error: "Invalid request format"})
		return
	}

	if req.Name == "" || req.URL == "" {
		c.JSON(400, ResponseError{Error: "Name and URL are required"})
		return
	}

	// Check if stream already exists
	if _, exists := Config.Streams[req.Name]; exists {
		c.JSON(409, ResponseError{Error: "Stream with this name already exists"})
		return
	}

	// Add new stream to configuration
	Config.Streams[req.Name] = StreamST{
		URL:          req.URL,
		OnDemand:     req.OnDemand,
		DisableAudio: req.DisableAudio,
		Debug:        req.Debug,
		Cl:           make(map[string]viewer),
	}

	// Save configuration to file
	if err := saveConfig(); err != nil {
		log.Printf("Warning: Failed to save config after adding stream %s: %v", req.Name, err)
		// Don't return error to client as the stream was added successfully in memory
	}

	response := StreamResponse{
		ID:           req.Name,
		Name:         req.Name,
		URL:          req.URL,
		Status:       false, // New stream starts inactive
		OnDemand:     req.OnDemand,
		DisableAudio: req.DisableAudio,
		Debug:        req.Debug,
	}

	c.JSON(201, response)
}

// HTTPAPIServerUpdateStream updates an existing stream configuration
func HTTPAPIServerUpdateStream(c *gin.Context) {
	streamID := c.Param("id")

	var req StreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, ResponseError{Error: "Invalid request format"})
		return
	}

	// Check if stream exists
	stream, exists := Config.Streams[streamID]
	if !exists {
		c.JSON(404, ResponseError{Error: "Stream not found"})
		return
	}

	// Update stream configuration
	if req.URL != "" {
		stream.URL = req.URL
	}
	stream.OnDemand = req.OnDemand
	stream.DisableAudio = req.DisableAudio
	stream.Debug = req.Debug

	Config.Streams[streamID] = stream

	// Save configuration to file
	if err := saveConfig(); err != nil {
		log.Printf("Warning: Failed to save config after updating stream %s: %v", streamID, err)
		// Don't return error to client as the stream was updated successfully in memory
	}

	response := StreamResponse{
		ID:           streamID,
		Name:         req.Name,
		URL:          stream.URL,
		Status:       Config.ext(streamID),
		OnDemand:     stream.OnDemand,
		DisableAudio: stream.DisableAudio,
		Debug:        stream.Debug,
	}

	c.JSON(200, response)
}

// HTTPAPIServerDeleteStream deletes a stream configuration
func HTTPAPIServerDeleteStream(c *gin.Context) {
	streamID := c.Param("id")

	// Check if stream exists
	if _, exists := Config.Streams[streamID]; !exists {
		c.JSON(404, ResponseError{Error: "Stream not found"})
		return
	}

	// Remove from configuration - this will automatically stop the stream when it runs out of viewers
	delete(Config.Streams, streamID)

	// Save configuration to file
	if err := saveConfig(); err != nil {
		log.Printf("Warning: Failed to save config after deleting stream %s: %v", streamID, err)
		// Don't return error to client as the stream was deleted successfully in memory
	}

	c.JSON(204, nil)
}

// HTTPAPIServerStreamInfo returns information about a specific stream
func HTTPAPIServerStreamInfo(c *gin.Context) {
	streamID := c.Param("id")

	stream, exists := Config.Streams[streamID]
	if !exists {
		c.JSON(404, ResponseError{Error: "Stream not found"})
		return
	}

	status := "inactive"
	if Config.ext(streamID) {
		status = "active"
	}

	response := StreamInfoResponse{
		UUID:     streamID,
		URL:      stream.URL,
		OnDemand: stream.OnDemand,
		Status:   status,
	}

	c.JSON(200, response)
}

// saveConfig saves the current configuration to config.json
func saveConfig() error {
	Config.mutex.Lock()
	defer Config.mutex.Unlock()

	// Create a temporary config structure for JSON serialization
	configData := struct {
		Server  ServerST            `json:"server"`
		Streams map[string]StreamST `json:"streams"`
	}{
		Server:  Config.Server,
		Streams: Config.Streams,
	}

	// Convert to JSON with proper formatting
	data, err := json.MarshalIndent(configData, "", "  ")
	if err != nil {
		log.Printf("Error marshaling config: %v", err)
		return err
	}

	// Write to config.json
	err = ioutil.WriteFile("config.json", data, 0644)
	if err != nil {
		log.Printf("Error writing config file: %v", err)
		return err
	}

	log.Println("Configuration saved to config.json")
	return nil
}
