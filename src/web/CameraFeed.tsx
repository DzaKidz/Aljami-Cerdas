import { useEffect, useRef, useState } from "react";
import { Camera, HandPalm, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { countFingers } from "../domain/timer.js";

export function CameraFeed({
  enabled,
  onCount,
  onReady,
  compact = false,
}: {
  enabled: boolean;
  onCount: (count: number) => void;
  onReady: (ready: boolean) => void;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countCallback = useRef(onCount);
  const readyCallback = useRef(onReady);
  const [status, setStatus] = useState("OFF");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);
  countCallback.current = onCount;
  readyCallback.current = onReady;
  useEffect(() => {
    if (!enabled) {
      setStatus("OFF");
      readyCallback.current(false);
      countCallback.current(0);
      return;
    }
    let disposed = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    let detector: import("@mediapipe/tasks-vision").HandLandmarker | null = null;
    let lastTime = -1;
    let lastRun = 0;
    let previousCount = -1;
    setStatus("LOADING");
    setMessage("");
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("Kamera memerlukan localhost atau koneksi HTTPS.");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks("/mediapipe");
        detector = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "/models/hand_landmarker.task", delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65,
        });
        if (disposed) {
          detector.close();
          return;
        }
        stream.getVideoTracks().forEach((track) =>
          track.addEventListener("ended", () => {
            if (!disposed) {
              setStatus("ERROR");
              setMessage("Kamera terputus. Matikan lalu aktifkan kamera kembali.");
              readyCallback.current(false);
              countCallback.current(0);
            }
          }),
        );
        setStatus("READY");
        readyCallback.current(true);
        const draw = (now: number) => {
          if (disposed) return;
          try {
            if (video.readyState >= 2 && now - lastRun >= 65 && video.currentTime !== lastTime) {
              lastRun = now;
              lastTime = video.currentTime;
              const result = detector!.detectForVideo(video, now);
              const landmarks = result.landmarks.length === 1 ? result.landmarks[0] : undefined;
              const fingers = landmarks ? countFingers(landmarks) : 0;
              countCallback.current(fingers);
              if (previousCount !== fingers) {
                setCount(fingers);
                previousCount = fingers;
              }
              const canvas = canvasRef.current!;
              const context = canvas.getContext("2d")!;
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.clearRect(0, 0, canvas.width, canvas.height);
              if (landmarks) {
                context.strokeStyle = "#eab308";
                context.lineWidth = 3;
                for (const connection of HandLandmarker.HAND_CONNECTIONS) {
                  const a = landmarks[connection.start]!;
                  const b = landmarks[connection.end]!;
                  context.beginPath();
                  context.moveTo(a.x * canvas.width, a.y * canvas.height);
                  context.lineTo(b.x * canvas.width, b.y * canvas.height);
                  context.stroke();
                }
                context.fillStyle = "#f0fdf4";
                for (const point of landmarks) {
                  context.beginPath();
                  context.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
                  context.fill();
                }
              }
            }
            frame = requestAnimationFrame(draw);
          } catch {
            setStatus("ERROR");
            setMessage("Pembacaan kamera berhenti. Coba aktifkan ulang kamera.");
            readyCallback.current(false);
            countCallback.current(0);
          }
        };
        frame = requestAnimationFrame(draw);
      } catch (e) {
        stream?.getTracks().forEach((track) => track.stop());
        if (!disposed) {
          setStatus("ERROR");
          setMessage(
            e instanceof DOMException && e.name === "NotAllowedError"
              ? "Izin kamera belum diberikan. Izinkan kamera pada browser, lalu coba lagi."
              : e instanceof Error
                ? e.message
                : "Kamera tidak tersedia.",
          );
          readyCallback.current(false);
        }
      }
    }
    void start();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      detector?.close();
      countCallback.current(0);
      readyCallback.current(false);
    };
  }, [enabled]);
  return (
    <div className={`camera-feed ${compact ? "compact" : ""}`}>
      <video ref={videoRef} muted autoPlay playsInline />
      <canvas ref={canvasRef} />
      {status !== "READY" && (
        <div className="camera-placeholder">
          {status === "LOADING" ? (
            <SpinnerGap className="spin" size={38} />
          ) : status === "ERROR" ? (
            <WarningCircle size={38} />
          ) : (
            <Camera size={42} weight="duotone" />
          )}
          <strong>
            {status === "LOADING"
              ? "Menyiapkan kamera…"
              : status === "ERROR"
                ? "Kamera belum siap"
                : "Ruang untuk santri Anda"}
          </strong>
          <p>
            {message ||
              (status === "LOADING"
                ? "Memuat pembaca gestur tangan."
                : "Aktifkan kamera untuk mengecek posisi dan pencahayaan.")}
          </p>
        </div>
      )}
      {status === "READY" && (
        <>
          <div className="camera-badge">
            <span />
            Kamera aktif
          </div>
          <div className="gesture-label">
            <HandPalm size={19} />
            {count >= 1 && count <= 4
              ? `${count} jari terdeteksi`
              : count > 4
                ? "Gunakan 1 sampai 4 jari"
                : "Angkat satu tangan"}
          </div>
          <div className="camera-corners" />
        </>
      )}
    </div>
  );
}
