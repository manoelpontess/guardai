/**
 * GuardAI — WebRTC Streaming Utility
 *
 * Handles peer-to-peer camera streaming between:
 * - Camera device (sender) → Viewer device (receiver)
 *
 * Uses a simple signaling server (WebSocket) to exchange
 * SDP offers/answers and ICE candidates.
 *
 * In production, replace SIGNALING_URL with your own server.
 */

export const SIGNALING_URL = 'wss://your-signaling-server.com/ws';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add TURN servers for production (NAT traversal):
  // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
];

export class GuardAIStreamer {
  private pc: RTCPeerConnection | null = null;
  private ws: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private cameraId: string;
  private role: 'camera' | 'viewer';
  private onRemoteStream?: (stream: MediaStream) => void;
  private onConnectionChange?: (state: RTCPeerConnectionState) => void;

  constructor(
    cameraId: string,
    role: 'camera' | 'viewer',
    callbacks?: {
      onRemoteStream?: (stream: MediaStream) => void;
      onConnectionChange?: (state: RTCPeerConnectionState) => void;
    }
  ) {
    this.cameraId = cameraId;
    this.role = role;
    this.onRemoteStream = callbacks?.onRemoteStream;
    this.onConnectionChange = callbacks?.onConnectionChange;
  }

  async startCamera(videoConstraints?: MediaTrackConstraints): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints ?? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 24 },
        facingMode: 'environment',
      },
      audio: true,
    });
    this.localStream = stream;
    return stream;
  }

  async connect(): Promise<void> {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onconnectionstatechange = () => {
      this.onConnectionChange?.(this.pc!.connectionState);
    };

    this.pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.onRemoteStream?.(remoteStream);
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({ type: 'ice-candidate', candidate: event.candidate });
      }
    };

    if (this.role === 'camera' && this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    this.ws = new WebSocket(`${SIGNALING_URL}?cameraId=${this.cameraId}&role=${this.role}`);

    this.ws.onopen = async () => {
      if (this.role === 'viewer') {
        // Viewer initiates the offer
        const offer = await this.pc!.createOffer();
        await this.pc!.setLocalDescription(offer);
        this.sendSignal({ type: 'offer', sdp: offer });
      }
    };

    this.ws.onmessage = async (event) => {
      const signal = JSON.parse(event.data);
      await this.handleSignal(signal);
    };
  }

  private async handleSignal(signal: any) {
    if (!this.pc) return;

    if (signal.type === 'offer') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.sendSignal({ type: 'answer', sdp: answer });
    } else if (signal.type === 'answer') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    } else if (signal.type === 'ice-candidate') {
      await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }

  private sendSignal(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ...data, cameraId: this.cameraId }));
    }
  }

  async disconnect() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.ws?.close();
    this.pc = null;
    this.ws = null;
    this.localStream = null;
  }

  getLocalStream() {
    return this.localStream;
  }
}

// ─── React Native wrapper (expo-camera integration) ──────────────────────────
// For native mobile, use a different approach since WebRTC
// requires a native module like react-native-webrtc
//
// Installation: npx expo install react-native-webrtc
// Then replace the web RTCPeerConnection above with:
// import { RTCPeerConnection, RTCSessionDescription,
//          RTCIceCandidate, mediaDevices } from 'react-native-webrtc';
