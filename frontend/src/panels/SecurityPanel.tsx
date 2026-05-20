import React, { useEffect, useState, useRef } from 'react';
import { useSecurityStore } from '../stores/security';
import { createSecurityWSManager } from '../api/websocket';
import type { SecurityEvent, Camera, MotionEventMessage } from '../types/index';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Shield, Camera, AlertTriangle } from 'lucide-react';

export const SecurityPanel: React.FC = () => {
  const {
    events,
    cameras,
    selectedCamera,
    armedSystems,
    loading,
    error,
    wsConnected,
    addEvent,
    setCameras,
    selectCamera,
    setArmed,
    setWsConnected,
    setLoading,
    setError,
  } = useSecurityStore();

  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [motionAlert, setMotionAlert] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const wsManagerRef = useRef<ReturnType<typeof createSecurityWSManager> | null>(null);
  const snapshotIntervalRef = useRef<NodeJS.Timer | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timer | null>(null);

  // Load cameras on mount
  useEffect(() => {
    const loadCameras = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/security/cameras');
        setCameras(response.data.cameras || []);
        // Select first camera if available
        if (response.data.cameras && response.data.cameras.length > 0) {
          selectCamera(response.data.cameras[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cameras');
      } finally {
        setLoading(false);
      }
    };

    loadCameras();
  }, [setCameras, setLoading, setError, selectCamera]);

  // Load initial events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await axios.get('/api/security/events?limit=50');
        // Events will be added individually via WebSocket
      } catch (err) {
        console.error('Failed to load events:', err);
      }
    };

    loadEvents();
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    const wsManager = createSecurityWSManager();
    wsManagerRef.current = wsManager;

    wsManager.on('motion_event', (message: MotionEventMessage) => {
      const newEvent = {
        id: `${Date.now()}`,
        timestamp: message.timestamp,
        camera_id: message.camera,
        confidence: message.confidence,
        thumbnail_url: message.thumbnail_url,
        narration: message.narration,
        created_at: new Date().toISOString(),
      };
      addEvent(newEvent);
      setLastEventTime(new Date());

      // Trigger motion alert animation
      if (message.confidence > 0.7) {
        setMotionAlert(true);
        if (alertTimeoutRef.current) {
          clearTimeout(alertTimeoutRef.current);
        }
        alertTimeoutRef.current = setTimeout(() => setMotionAlert(false), 3000);

        // Play alert sound
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
          console.log('Audio alert not supported');
        }
      }
    });

    wsManager.onConnect(() => {
      setWsConnected(true);
    });

    wsManager.onDisconnect(() => {
      setWsConnected(false);
    });

    wsManager.connect().catch((err) => {
      console.error('Failed to connect WebSocket:', err);
      setWsConnected(false);
    });

    return () => {
      if (wsManager) {
        wsManager.disconnect();
      }
    };
  }, [addEvent, setWsConnected]);

  // Load snapshot for selected camera
  useEffect(() => {
    const loadSnapshot = async () => {
      if (!selectedCamera) return;

      try {
        setSnapshotLoading(true);
        const response = await axios.get(`/api/security/snapshot/${selectedCamera}`, {
          responseType: 'blob',
        });
        const blobUrl = URL.createObjectURL(response.data);
        setSnapshot(blobUrl);
      } catch (err) {
        console.error('Failed to load snapshot:', err);
      } finally {
        setSnapshotLoading(false);
      }
    };

    loadSnapshot();

    // Refresh snapshot every 5 seconds
    snapshotIntervalRef.current = setInterval(loadSnapshot, 5000);

    return () => {
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
      }
    };
  }, [selectedCamera]);

  const handleArmToggle = async (systemId: string = 'default') => {
    try {
      const currentArmed = armedSystems.get(systemId) ?? false;
      const response = await axios.post('/api/security/arm', {
        system_id: systemId,
        state: !currentArmed,
      });
      setArmed(systemId, response.data.armed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to arm/disarm system');
    }
  };

  const selectedCameraObj = cameras.find((c) => c.id === selectedCamera);
  const isArmed = armedSystems.get('default') ?? false;
  const recentEvents = events.slice(0, 10);
  const highConfidenceEvents = events.filter((e) => e.confidence > 0.8);

  return (
    <div className="h-full flex flex-col bg-obsidian-bg text-obsidian-text overflow-hidden">
      {/* Top Command Center - Camera Pill Nav */}
      <div className={`px-6 py-4 border-b transition-colors ${
        motionAlert
          ? 'border-obsidian-error bg-obsidian-error/10 animate-pulse'
          : 'border-obsidian-border bg-obsidian-surface'
      }`}>
        <div className="flex items-center justify-between gap-4">
          {/* Left: Status + Camera Selector */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <Shield className={`w-6 h-6 ${isArmed ? 'text-obsidian-error' : 'text-obsidian-success'}`} />
              <span className="text-xl font-bold">{isArmed ? 'ARMED' : 'DISARMED'}</span>
            </div>

            {wsConnected && (
              <Badge variant="success" className="text-xs">
                <span className="w-1.5 h-1.5 bg-obsidian-success rounded-full mr-1 animate-pulse"></span>
                Live
              </Badge>
            )}

            {motionAlert && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Motion Detected
              </Badge>
            )}
          </div>

          {/* Center: Camera Pills */}
          <div className="flex gap-2 flex-wrap justify-center">
            {cameras.map((camera) => (
              <button
                key={camera.id}
                onClick={() => selectCamera(camera.id)}
                className={`px-4 py-2 rounded-full text-sm transition flex items-center gap-2 ${
                  selectedCamera === camera.id
                    ? 'bg-obsidian-accent text-white'
                    : 'bg-obsidian-surface-hover text-obsidian-text hover:bg-obsidian-border'
                }`}
              >
                <Camera className="w-4 h-4" />
                {camera.name}
              </button>
            ))}
          </div>

          {/* Right: Large ARM/DISARM Button */}
          <Button
            onClick={() => handleArmToggle()}
            className={`px-8 py-3 rounded-lg font-bold text-lg transition transform hover:scale-105 ${
              isArmed
                ? 'bg-obsidian-error hover:bg-red-700 text-white shadow-lg shadow-red-900/50'
                : 'bg-obsidian-success hover:bg-green-700 text-white shadow-lg shadow-green-900/50'
            }`}
          >
            {isArmed ? 'ARMED' : 'DISARM'}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Center: Large Camera Feed */}
        <div className="flex-1 flex flex-col bg-obsidian-bg p-4 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center bg-black rounded-lg overflow-hidden border-2 border-obsidian-border relative">
            {selectedCameraObj && snapshot ? (
              <>
                <img
                  src={snapshot}
                  alt={selectedCameraObj.name}
                  className={`w-full h-full object-contain transition-all ${
                    motionAlert ? 'border-2 border-obsidian-error' : ''
                  }`}
                  style={{
                    filter: motionAlert ? 'brightness(1.2)' : 'brightness(1)',
                  }}
                />
                {snapshotLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="animate-spin">
                      <svg className="w-12 h-12 text-obsidian-accent" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <Camera className="w-16 h-16 text-obsidian-text-muted mx-auto mb-4 opacity-50" />
                <p className="text-obsidian-text-muted">
                  {selectedCamera ? 'Loading snapshot...' : 'Select a camera'}
                </p>
              </div>
            )}
          </div>

          {/* Camera Info */}
          {selectedCameraObj && (
            <div className="mt-2 text-center text-sm text-obsidian-text-muted">
              {selectedCameraObj.name} • {selectedCameraObj.status || 'unknown'}
            </div>
          )}
        </div>

        {/* Right: Event Timeline */}
        <div className="w-80 border-l border-obsidian-border bg-obsidian-surface flex flex-col overflow-hidden">
          {/* Timeline Header */}
          <div className="p-4 border-b border-obsidian-border">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-obsidian-error" />
              Motion Events
            </h3>
            <p className="text-xs text-obsidian-text-muted mt-1">{events.length} total • {highConfidenceEvents.length} high confidence</p>
          </div>

          {/* Events Timeline Feed */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {recentEvents.length === 0 ? (
                <div className="text-center text-obsidian-text-muted text-sm py-8">
                  No motion events
                </div>
              ) : (
                recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border transition ${
                      event.confidence > 0.8
                        ? 'bg-obsidian-error/10 border-obsidian-error/50'
                        : event.confidence > 0.5
                        ? 'bg-obsidian-warning/10 border-obsidian-warning/50'
                        : 'bg-obsidian-surface-hover border-obsidian-border'
                    }`}
                  >
                    <div className="flex gap-2">
                      {event.thumbnail_url && (
                        <img
                          src={event.thumbnail_url}
                          alt="Event thumbnail"
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-obsidian-text truncate text-sm">
                            {event.camera_id}
                          </span>
                          <Badge
                            variant={
                              event.confidence > 0.8
                                ? 'destructive'
                                : event.confidence > 0.5
                                ? 'warning'
                                : 'secondary'
                            }
                            className="text-xs flex-shrink-0"
                          >
                            {(event.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        {event.narration && (
                          <p className="text-xs text-obsidian-text-muted mt-1">{event.narration}</p>
                        )}
                        <div className="text-xs text-obsidian-text-muted mt-1">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 bg-obsidian-error/20 text-red-300 text-sm border-t border-obsidian-error/50 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};

export default SecurityPanel;
