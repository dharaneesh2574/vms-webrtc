import axios, { AxiosError } from 'axios';
import { Camera } from '../types';

const API_BASE_URL = 'http://localhost:8083/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Delay 1 second between retries

export const fetchDevices = async (retryCount = 0): Promise<Camera[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/streams`, {
      headers: {
        'ngrok-skip-browser-warning': 'true', // Add this header to bypass ngrok warning
        'Accept': 'application/json', // Ensure JSON response
      },
    });
    if (response.headers['content-type']?.includes('application/json')) {
      console.log('Streams response:', response.data);
      const streamsMap = response.data.streams || {};
      return Object.keys(streamsMap).map((url) => ({
        id: url,
        name: streamsMap[url].name || url,
        streamUrl: url,
        status: streamsMap[url].status ? 'active' : 'inactive',
        audioEnabled: !streamsMap[url].disable_audio,
        ptzSupported: false,
        health: Math.floor(Math.random() * 100),
        onDemand: streamsMap[url].on_demand,
        disableAudio: streamsMap[url].disable_audio,
        debug: streamsMap[url].debug,
      }));
    } else {
      console.error('Received non-JSON response:', response.data);
      throw new Error('Invalid response format from server');
    }
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error('Failed to fetch streams:', {
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
    throw new Error('Failed to fetch streams from the backend');
  }
};

export const addDevice = async (device: { name: string; url: string; on_demand?: boolean; disable_audio?: boolean; debug?: boolean }): Promise<Camera> => {
  try {
    console.log('Sending POST /api/streams with payload:', device);
    const response = await axios.post(`${API_BASE_URL}/streams`, {
      name: device.name,
      url: device.url,
      on_demand: device.on_demand ?? true,
      disable_audio: device.disable_audio ?? true,
      debug: device.debug ?? false,
    }, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
      },
    });
    console.log('POST /api/streams response:', response.data);
    const newStream = response.data;
    const newCamera: Camera = {
      id: newStream.id,
      name: newStream.name,
      streamUrl: newStream.url,
      status: newStream.status ? 'active' : 'inactive',
      audioEnabled: !newStream.disable_audio,
      ptzSupported: false,
      health: 100,
      onDemand: newStream.on_demand,
      disableAudio: newStream.disable_audio,
      debug: newStream.debug,
    };
    return newCamera;
  } catch (error: any) {
    console.error('Failed to add stream:', {
      message: error.message,
      response: error.response ? error.response.data : null,
      status: error.response?.status,
    });
    throw new Error(error.response?.data?.error || 'Failed to add stream to the backend');
  }
};

export const removeDevice = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/stream/${encodeURIComponent(id)}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });
  } catch (error: unknown) {
    console.error('Failed to remove stream:', error);
    throw new Error('Failed to remove stream from the backend');
  }
};

export const updateDevice = async (id: string, updates: Partial<Camera> & { on_demand?: boolean; disable_audio?: boolean; debug?: boolean }): Promise<Camera> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/stream/${encodeURIComponent(id)}`, {
      name: updates.name,
      url: updates.streamUrl,
      on_demand: updates.on_demand ?? true,
      disable_audio: updates.disable_audio ?? true,
      debug: updates.debug ?? false,
    }, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
      },
    });
    const updatedStream = response.data;
    const updatedCamera: Camera = {
      id: updatedStream.id,
      name: updatedStream.name,
      streamUrl: updatedStream.url,
      status: updatedStream.status ? 'active' : 'inactive',
      audioEnabled: !updatedStream.disable_audio,
      ptzSupported: updates.ptzSupported ?? false,
      health: updates.health ?? Math.floor(Math.random() * 100),
      onDemand: updatedStream.on_demand,
      disableAudio: updatedStream.disable_audio,
      debug: updatedStream.debug,
    };
    return updatedCamera;
  } catch (error: any) {
    console.error('Failed to update stream:', {
      message: error.message,
      response: error.response ? error.response.data : null,
      status: error.response?.status,
    });
    throw new Error(error.response?.data?.error || 'Failed to update stream in the backend');
  }
};

export const sendAIPrompt = async (prompt: string): Promise<void> => {
  console.log('Sending AI Prompt:', prompt);
  // Implement AI prompt API call if needed
};