package main

import (
	"errors"
	"log"
	"time"

	"github.com/deepch/vdk/format/rtspv2"
)

var (
	ErrorStreamExitNoVideoOnStream = errors.New("stream exit no video on stream")
	ErrorStreamExitRtspDisconnect  = errors.New("stream exit rtsp disconnect")
	ErrorStreamExitNoViewer        = errors.New("stream exit on demand no viewer")
)

func serveStreams() {
	// Start all non-on-demand streams permanently
	for k, v := range Config.Streams {
		if !v.OnDemand {
			go RTSPWorkerLoop(k, v.URL, v.OnDemand, v.DisableAudio, v.Debug)
		}
	}

	// Initialize all on-demand streams to discover codecs
	go func() {
		time.Sleep(2 * time.Second) // Give non-on-demand streams time to start
		for k, v := range Config.Streams {
			if v.OnDemand {
				log.Println("Initializing on-demand stream for codec discovery:", k)
				go RTSPWorkerLoop(k, v.URL, v.OnDemand, v.DisableAudio, v.Debug)
			}
		}
	}()
}
func RTSPWorkerLoop(name, url string, OnDemand, DisableAudio, Debug bool) {
	defer Config.RunUnlock(name)
	for {
		log.Println("Stream Try Connect", name)
		err := RTSPWorker(name, url, OnDemand, DisableAudio, Debug)
		if err != nil {
			log.Println(err)
			Config.LastError = err
		}
		if OnDemand && !Config.HasViewer(name) {
			log.Println(ErrorStreamExitNoViewer)
			return
		}
		time.Sleep(1 * time.Second)
	}
}
func RTSPWorker(name, url string, OnDemand, DisableAudio, Debug bool) error {
	keyTest := time.NewTimer(20 * time.Second)
	clientTest := time.NewTimer(20 * time.Second)
	//add next TimeOut
	RTSPClient, err := rtspv2.Dial(rtspv2.RTSPClientOptions{URL: url, DisableAudio: DisableAudio, DialTimeout: 3 * time.Second, ReadWriteTimeout: 3 * time.Second, Debug: Debug})
	if err != nil {
		return err
	}
	defer RTSPClient.Close()
	if RTSPClient.CodecData != nil {
		Config.coAd(name, RTSPClient.CodecData)
	}
	var AudioOnly bool
	if len(RTSPClient.CodecData) == 1 && RTSPClient.CodecData[0].Type().IsAudio() {
		AudioOnly = true
	}
	for {
		select {
		case <-clientTest.C:
			if OnDemand {
				if !Config.HasViewer(name) {
					return ErrorStreamExitNoViewer
				} else {
					clientTest.Reset(20 * time.Second)
				}
			}
		case <-keyTest.C:
			return ErrorStreamExitNoVideoOnStream
		case signals := <-RTSPClient.Signals:
			switch signals {
			case rtspv2.SignalCodecUpdate:
				Config.coAd(name, RTSPClient.CodecData)
			case rtspv2.SignalStreamRTPStop:
				return ErrorStreamExitRtspDisconnect
			}
		case packetAV := <-RTSPClient.OutgoingPacketQueue:
			if AudioOnly || packetAV.IsKeyFrame {
				keyTest.Reset(20 * time.Second)
			}
			Config.cast(name, *packetAV)
		}
	}
}
