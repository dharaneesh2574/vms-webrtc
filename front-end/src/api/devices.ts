import axios, { AxiosError } from 'axios';
import { Camera } from '../types';

const GO2RTC_API_URL = 'http://localhost:1984/api'; // Updated to use go2rtc API
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Delay 1 second between retries

export const fetchDevices = async (retryCount = 0): Promise<Camera[]> => {
  try {
    const response = await axios.get(`${GO2RTC_API_URL}/streams`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.headers['content-type']?.includes('application/json')) {
      console.log('Streams response from go2rtc:', response.data);
      const streamsMap = response.data || {};
      
      return Object.keys(streamsMap).map((streamId) => {
        const stream = streamsMap[streamId];
        const hasProducers = stream.producers && stream.producers.length > 0;
        
        return {
          id: streamId,
          name: streamId, // Use stream ID as name
          streamUrl: hasProducers ? stream.producers[0].url : '',
          status: hasProducers ? 'active' : 'inactive',
          audioEnabled: true, // Default to enabled, can be toggled in UI
          ptzSupported: false, // Would need to be determined per camera
          health: hasProducers ? Math.floor(Math.random() * 30) + 70 : 0, // Random health for active streams
          onDemand: false,
          disableAudio: false,
          debug: false,
        };
      });
    } else {
      console.error('Received non-JSON response:', response.data);
      throw new Error('Invalid response format from go2rtc');
    }
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error('Failed to fetch streams from go2rtc:', {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        } : null,
      });
      
      if (retryCount < MAX_RETRIES && (error.code === 'ERR_NETWORK' || error.response?.status === 502)) {
        console.log(`Retrying fetchDevices (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchDevices(retryCount + 1);
      }
    } else {
      console.error('Unexpected error while fetching streams:', error);
    }
    throw new Error('Failed to fetch streams from go2rtc');
  }
};

export const addDevice = async (device: { 
  name: string; 
  url: string; 
  on_demand?: boolean; 
  disable_audio?: boolean; 
  debug?: boolean 
}): Promise<Camera> => {
  try {
    console.log('Adding new stream to go2rtc with payload:', device);
    
    // Create new stream in go2rtc
    const response = await axios.put(`${GO2RTC_API_URL}/streams`, null, {
      params: {
        src: device.url,
        name: device.name
      },
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('Stream added to go2rtc:', response.data);
    
    const newCamera: Camera = {
      id: device.name,
      name: device.name,
      streamUrl: device.url,
      status: 'active',
      audioEnabled: !device.disable_audio,
      ptzSupported: false,
      health: 100,
      onDemand: device.on_demand ?? false,
      disableAudio: device.disable_audio ?? false,
      debug: device.debug ?? false,
    };
    
    return newCamera;
  } catch (error: any) {
    console.error('Failed to add stream to go2rtc:', {
      message: error.message,
      response: error.response ? error.response.data : null,
      status: error.response?.status,
    });
    throw new Error(error.response?.data?.error || 'Failed to add stream to go2rtc');
  }
};

export const removeDevice = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${GO2RTC_API_URL}/streams`, {
      params: {
        src: id
      }
    });
    console.log(`Stream ${id} removed from go2rtc`);
  } catch (error: unknown) {
    console.error('Failed to remove stream from go2rtc:', error);
    throw new Error('Failed to remove stream from go2rtc');
  }
};

export const updateDevice = async (
  id: string, 
  updates: Partial<Camera> & { 
    on_demand?: boolean; 
    disable_audio?: boolean; 
    debug?: boolean 
  }
): Promise<Camera> => {
  try {
    // For go2rtc, we need to first remove the old stream and add the new one
    if (updates.streamUrl) {
      await removeDevice(id);
      return await addDevice({
        name: updates.name || id,
        url: updates.streamUrl,
        on_demand: updates.on_demand,
        disable_audio: updates.disable_audio,
        debug: updates.debug
      });
    }
    
    // If only updating metadata, return updated camera object
    const updatedCamera: Camera = {
      id: id,
      name: updates.name || id,
      streamUrl: updates.streamUrl || '',
      status: updates.status || 'active',
      audioEnabled: updates.audioEnabled ?? true,
      ptzSupported: updates.ptzSupported ?? false,
      health: updates.health ?? Math.floor(Math.random() * 100),
      onDemand: updates.on_demand ?? false,
      disableAudio: updates.disable_audio ?? false,
      debug: updates.debug ?? false,
    };
    
    return updatedCamera;
  } catch (error: any) {
    console.error('Failed to update stream in go2rtc:', {
      message: error.message,
      response: error.response ? error.response.data : null,
      status: error.response?.status,
    });
    throw new Error(error.response?.data?.error || 'Failed to update stream in go2rtc');
  }
};

export const sendAIPrompt = async (prompt: string): Promise<void> => {
  console.log('Sending AI Prompt:', prompt);
  // AI prompt functionality - could be implemented with additional services
};

// Additional utility function to get stream health/status
export const getStreamStatus = async (streamId: string): Promise<{ status: string; producers: number; consumers: number }> => {
  try {
    const response = await axios.get(`${GO2RTC_API_URL}/streams?src=${encodeURIComponent(streamId)}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const streamData = response.data;
    return {
      status: streamData.producers && streamData.producers.length > 0 ? 'active' : 'inactive',
      producers: streamData.producers ? streamData.producers.length : 0,
      consumers: streamData.consumers ? streamData.consumers.length : 0,
    };
  } catch (error) {
    console.error(`Failed to get status for stream ${streamId}:`, error);
    return { status: 'inactive', producers: 0, consumers: 0 };
  }
};