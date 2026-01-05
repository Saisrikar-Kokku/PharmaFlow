"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import {
    ScanBarcode,
    Camera,
    Keyboard,
    CheckCircle,
    AlertCircle,
    Volume2,
    VolumeX,
    Upload,
    ImageIcon,
} from "lucide-react";

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    mode?: "button" | "inline" | "dialog";
    placeholder?: string;
    className?: string;
}

// Extended window type for webkit audio
interface WebkitWindow extends Window {
    webkitAudioContext?: typeof AudioContext;
}

// Beep sound for successful scan
const playBeep = () => {
    try {
        const win = window as WebkitWindow;
        const AudioContextClass = window.AudioContext || win.webkitAudioContext;
        if (!AudioContextClass) return;
        
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 1000;
        oscillator.type = "sine";
        gainNode.gain.value = 0.3;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
        // Audio not supported, fail silently
    }
};

// Html5Qrcode scanner type
type Html5QrcodeScanner = {
    start: (
        cameraIdOrConfig: string | object,
        configuration: object,
        qrCodeSuccessCallback: (decodedText: string) => void,
        qrCodeErrorCallback: () => void
    ) => Promise<void>;
    stop: () => Promise<void>;
    getState: () => number;
};

export function BarcodeScanner({
    onScan,
    isOpen: controlledIsOpen,
    onOpenChange,
    mode = "button",
    placeholder = "Ready to scan...",
    className = "",
}: BarcodeScannerProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [scanMode, setScanMode] = useState<"usb" | "camera" | "image">("usb");
    const [isScanning, setIsScanning] = useState(false);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);

    // Scanner refs
    const lastKeyTime = useRef<number>(0);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const isScannerRunning = useRef<boolean>(false);
    const videoRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
    const setIsOpen = onOpenChange || setInternalIsOpen;

    // Successful scan handler - defined before useEffects
    const handleSuccessfulScan = useCallback((barcode: string) => {
        const cleanBarcode = barcode.trim();
        if (!cleanBarcode) return;

        setLastScanned(cleanBarcode);

        if (soundEnabled) {
            playBeep();
        }

        // Vibrate on mobile devices
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        onScan(cleanBarcode);
    }, [onScan, soundEnabled]);

    // Convert file to data URL for QuaggaJS
    const fileToDataURL = useCallback((file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }, []);

    // Apply unsharp mask for blur handling
    const applyUnsharpMask = useCallback((imageData: ImageData, amount: number = 0.5): void => {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Create a copy for the blur
        const original = new Uint8ClampedArray(data);
        
        // Simple box blur (3x3 kernel)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nIdx = ((y + dy) * width + (x + dx)) * 4 + c;
                            sum += original[nIdx];
                        }
                    }
                    const blurred = sum / 9;
                    // Unsharp mask: original + amount * (original - blurred)
                    data[idx + c] = Math.min(255, Math.max(0, 
                        original[idx + c] + amount * (original[idx + c] - blurred)
                    ));
                }
            }
        }
    }, []);

    // Yield to browser to keep UI responsive
    const yieldToUI = useCallback(() => new Promise<void>(resolve => setTimeout(resolve, 0)), []);

    // Helper function to process image for better barcode detection (non-blocking)
    const processImageForScanning = useCallback((
        file: File, 
        options: {
            scale?: number;
            grayscale?: boolean;
            highContrast?: boolean;
            sharpen?: boolean;
        } = {}
    ): Promise<File> => {
        const { scale = 1, grayscale = false, highContrast = false, sharpen = false } = options;
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                resolve(file);
                return;
            }

            img.onload = async () => {
                // Calculate dimensions with scale
                let width = img.width * scale;
                let height = img.height * scale;
                
                // Ensure minimum size for barcode detection
                const minSize = 800;
                if (width < minSize && height < minSize) {
                    const scaleFactor = minSize / Math.min(width, height);
                    width *= scaleFactor;
                    height *= scaleFactor;
                }
                
                // Cap maximum size (smaller for faster processing)
                const maxSize = 1600;
                if (width > maxSize || height > maxSize) {
                    const scaleFactor = maxSize / Math.max(width, height);
                    width *= scaleFactor;
                    height *= scaleFactor;
                }
                
                canvas.width = Math.round(width);
                canvas.height = Math.round(height);
                
                // Draw image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Get image data for processing
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Apply sharpening (simplified for speed)
                if (sharpen) {
                    applyUnsharpMask(imageData, 1.0);
                }
                
                await yieldToUI(); // Allow UI to update
                
                if (grayscale) {
                    for (let i = 0; i < data.length; i += 4) {
                        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                        data[i] = gray;
                        data[i + 1] = gray;
                        data[i + 2] = gray;
                    }
                }
                
                if (highContrast) {
                    // Apply high contrast
                    const contrast = 1.6;
                    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
                    
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
                        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
                        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
                    }
                    
                    // Simple threshold
                    for (let i = 0; i < data.length; i += 4) {
                        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        const bw = avg > 128 ? 255 : 0;
                        data[i] = bw;
                        data[i + 1] = bw;
                        data[i + 2] = bw;
                    }
                } else if (!grayscale) {
                    // Standard contrast enhancement
                    const contrast = 1.3;
                    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
                    
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
                        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
                        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
                    }
                }
                
                ctx.putImageData(imageData, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, { type: 'image/png' }));
                    } else {
                        resolve(file);
                    }
                }, 'image/png', 0.9);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }, [applyUnsharpMask, yieldToUI]);

    // Scan image using QuaggaJS - specialized for 1D barcodes with better localization
    const scanWithQuagga = useCallback(async (imageDataUrl: string): Promise<string | null> => {
        return new Promise((resolve) => {
            import("@ericblade/quagga2").then((Quagga) => {
                const QuaggaLib = Quagga.default || Quagga;
                
                QuaggaLib.decodeSingle({
                    src: imageDataUrl,
                    numOfWorkers: 0, // Use main thread for reliability
                    inputStream: {
                        size: 1920, // Process at high resolution
                        singleChannel: false,
                    },
                    locator: {
                        patchSize: "medium", // Helps find barcode in larger images
                        halfSample: false, // Keep full resolution
                    },
                    decoder: {
                        readers: [
                            "ean_reader",
                            "ean_8_reader",
                            "upc_reader",
                            "upc_e_reader",
                            "code_128_reader",
                            "code_39_reader",
                            "code_93_reader",
                            "codabar_reader",
                            "i2of5_reader",
                        ],
                        multiple: false,
                    },
                    locate: true, // Enable barcode localization (finds barcode anywhere in image)
                }, (result) => {
                    if (result && result.codeResult && result.codeResult.code) {
                        resolve(result.codeResult.code);
                    } else {
                        resolve(null);
                    }
                });
            }).catch(() => {
                resolve(null);
            });
        });
    }, []);

    // Scan image using QuaggaJS with different settings
    const scanWithQuaggaAggressive = useCallback(async (imageDataUrl: string): Promise<string | null> => {
        return new Promise((resolve) => {
            import("@ericblade/quagga2").then((Quagga) => {
                const QuaggaLib = Quagga.default || Quagga;
                
                QuaggaLib.decodeSingle({
                    src: imageDataUrl,
                    numOfWorkers: 0,
                    inputStream: {
                        size: 2400, // Even higher resolution
                        singleChannel: false,
                    },
                    locator: {
                        patchSize: "small", // Smaller patches for better localization
                        halfSample: false,
                    },
                    decoder: {
                        readers: [
                            "ean_reader",
                            "ean_8_reader", 
                            "upc_reader",
                            "upc_e_reader",
                            "code_128_reader",
                            "code_39_reader",
                        ],
                        multiple: false,
                    },
                    locate: true,
                }, (result) => {
                    if (result && result.codeResult && result.codeResult.code) {
                        resolve(result.codeResult.code);
                    } else {
                        resolve(null);
                    }
                });
            }).catch(() => {
                resolve(null);
            });
        });
    }, []);

    // Image upload handler - scan barcode from uploaded image with multiple attempts
    const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setImageError('Please upload an image file (JPG, PNG, etc.)');
            return;
        }

        setIsProcessingImage(true);
        setImageError(null);
        setLastScanned(null);

        try {
            let decodedText: string | null = null;

            // === STAGE 1: Try QuaggaJS on original image (fastest) ===
            const originalDataUrl = await fileToDataURL(file);
            await yieldToUI();
            
            decodedText = await scanWithQuagga(originalDataUrl);
            if (decodedText) {
                handleSuccessfulScan(decodedText);
                return;
            }

            await yieldToUI();

            // === STAGE 2: Try with sharpened image (helps with blur) ===
            const processedSharpened = await processImageForScanning(file, { sharpen: true });
            await yieldToUI();
            
            const sharpenedUrl = await fileToDataURL(processedSharpened);
            decodedText = await scanWithQuagga(sharpenedUrl);
            if (decodedText) {
                handleSuccessfulScan(decodedText);
                return;
            }

            await yieldToUI();

            // === STAGE 3: Try aggressive settings ===
            decodedText = await scanWithQuaggaAggressive(originalDataUrl);
            if (decodedText) {
                handleSuccessfulScan(decodedText);
                return;
            }

            await yieldToUI();

            // === STAGE 4: Try grayscale ===
            const processedGrayscale = await processImageForScanning(file, { grayscale: true });
            await yieldToUI();
            
            const grayscaleUrl = await fileToDataURL(processedGrayscale);
            decodedText = await scanWithQuagga(grayscaleUrl);
            if (decodedText) {
                handleSuccessfulScan(decodedText);
                return;
            }

            await yieldToUI();

            // === STAGE 5: Try high contrast ===
            const processedHighContrast = await processImageForScanning(file, { highContrast: true });
            await yieldToUI();
            
            const contrastUrl = await fileToDataURL(processedHighContrast);
            decodedText = await scanWithQuagga(contrastUrl);
            if (decodedText) {
                handleSuccessfulScan(decodedText);
                return;
            }

            await yieldToUI();

            // === STAGE 6: Try scaled up (for small barcodes) ===
            const scaledUp = await processImageForScanning(file, { scale: 1.5 });
            await yieldToUI();
            
            const scaledUpUrl = await fileToDataURL(scaledUp);
            decodedText = await scanWithQuagga(scaledUpUrl);
            if (decodedText) {
                handleSuccessfulScan(decodedText);
                return;
            }

            await yieldToUI();

            // === STAGE 7: Fallback to html5-qrcode (for QR codes) ===
            try {
                const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

                const allFormats = [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.DATA_MATRIX,
                ];

                const scanner = new Html5Qrcode("barcode-image-scanner", {
                    formatsToSupport: allFormats,
                    verbose: false,
                });

                try {
                    decodedText = await scanner.scanFile(file, true);
                    scanner.clear();
                    if (decodedText) {
                        handleSuccessfulScan(decodedText);
                        return;
                    }
                } catch {
                    scanner.clear();
                }
            } catch {
                // html5-qrcode fallback failed
            }

            // === NO BARCODE FOUND ===
            setImageError(
                'No barcode detected in this image.\n\n' +
                'Tips:\n' +
                '• Make sure barcode is clearly visible\n' +
                '• Try a closer/clearer photo\n' +
                '• Avoid shadows and glare'
            );
            
        } catch (error) {
            console.error("Image scan error:", error);
            setImageError('Failed to process image. Please try another image.');
        } finally {
            setIsProcessingImage(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [handleSuccessfulScan, processImageForScanning, fileToDataURL, scanWithQuagga, scanWithQuaggaAggressive, yieldToUI]);

    // USB/Bluetooth Scanner Detection
    // Barcode scanners send characters rapidly followed by Enter
    useEffect(() => {
        if (!isOpen || scanMode !== "usb") return;

        let buffer = "";
        let timeout: NodeJS.Timeout;

        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            const timeDiff = currentTime - lastKeyTime.current;

            // If keys are coming in rapidly (< 50ms apart), it's likely a scanner
            if (timeDiff > 100) {
                buffer = "";
            }

            lastKeyTime.current = currentTime;

            if (e.key === "Enter" && buffer.length >= 3) {
                e.preventDefault();
                handleSuccessfulScan(buffer);
                buffer = "";
            } else if (e.key.length === 1) {
                buffer += e.key;
            }

            // Clear buffer after 500ms of no input
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                buffer = "";
            }, 500);
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            clearTimeout(timeout);
        };
    }, [isOpen, scanMode, handleSuccessfulScan]);

    // Safe stop function that checks scanner state
    const safeStopScanner = useCallback(async (scanner: Html5QrcodeScanner | null) => {
        if (!scanner) return;
        
        try {
            // Check if scanner has getState method
            const scannerState = scanner.getState?.();
            // Html5QrcodeScannerState: NOT_STARTED=0, SCANNING=1, PAUSED=2
            if (scannerState === 1 || scannerState === 2) {
                await scanner.stop();
            }
        } catch {
            // Ignore all errors - scanner wasn't running
        }
    }, []);

    // Camera Scanner using html5-qrcode
    useEffect(() => {
        if (!isOpen || scanMode !== "camera" || !videoRef.current) return;

        let isMounted = true;
        let localScanner: Html5QrcodeScanner | null = null;

        const startCamera = async () => {
            setIsScanning(false);
            setCameraError(null);
            isScannerRunning.current = false;

            try {
                // Dynamic import to avoid SSR issues
                const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

                // Check if we're still mounted after async import
                if (!isMounted) return;

                // Configure supported barcode formats for better detection
                const formatsToSupport = [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.CODE_93,
                    Html5QrcodeSupportedFormats.CODABAR,
                    Html5QrcodeSupportedFormats.ITF,
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.DATA_MATRIX,
                    Html5QrcodeSupportedFormats.PDF_417,
                ];

                localScanner = new Html5Qrcode("barcode-scanner-video", {
                    formatsToSupport,
                    verbose: false,
                }) as unknown as Html5QrcodeScanner;
                scannerRef.current = localScanner;

                // Check again before starting
                if (!isMounted) {
                    localScanner = null;
                    scannerRef.current = null;
                    return;
                }

                // Start camera with optimized settings for barcode scanning
                await localScanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 30, // Higher FPS for faster detection
                        qrbox: { width: 300, height: 150 }, // Larger scan area for barcodes
                        aspectRatio: 1.777778,
                        disableFlip: false,
                    },
                    (decodedText: string) => {
                        if (isMounted) {
                            handleSuccessfulScan(decodedText);
                        }
                    },
                    () => {
                        // Barcode scanning failure (ignore, continuous scanning)
                    }
                );

                // Apply camera optimizations after start
                try {
                    const videoElement = document.querySelector('#barcode-scanner-video video') as HTMLVideoElement;
                    if (videoElement && videoElement.srcObject) {
                        const stream = videoElement.srcObject as MediaStream;
                        const track = stream.getVideoTracks()[0];
                        
                        if (track) {
                            const capabilities = track.getCapabilities?.() as Record<string, unknown> | undefined;
                            const constraints: MediaTrackConstraintSet[] = [];
                            
                            // Apply continuous autofocus if supported
                            if (capabilities && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
                                constraints.push({ focusMode: 'continuous' } as MediaTrackConstraintSet);
                            }
                            
                            // Set higher resolution for better barcode detection
                            if (capabilities && capabilities.width) {
                                const widthCap = capabilities.width as { max?: number };
                                if (widthCap.max && widthCap.max >= 1920) {
                                    constraints.push({ width: { ideal: 1920 } } as MediaTrackConstraintSet);
                                }
                            }
                            
                            // Apply torch/flashlight if available (helps in low light)
                            // if (capabilities && Array.isArray(capabilities.torch)) {
                            //     constraints.push({ torch: true } as MediaTrackConstraintSet);
                            // }
                            
                            if (constraints.length > 0) {
                                await track.applyConstraints({ advanced: constraints });
                            }
                        }
                    }
                } catch {
                    // Camera optimizations not supported, continue anyway
                }

                // Check if still mounted after start completes
                if (isMounted) {
                    isScannerRunning.current = true;
                    setIsScanning(true);
                } else {
                    // Unmounted while starting - stop immediately
                    await safeStopScanner(localScanner);
                    localScanner = null;
                }
            } catch (err: unknown) {
                console.error("Camera error:", err);
                isScannerRunning.current = false;
                if (isMounted) {
                    const errorMessage = err instanceof Error ? err.message : "Failed to access camera";
                    setCameraError(errorMessage);
                    setIsScanning(false);
                }
            }
        };

        startCamera();

        return () => {
            isMounted = false;
            isScannerRunning.current = false;
            
            // Stop scanner safely
            if (localScanner) {
                safeStopScanner(localScanner);
            }
            scannerRef.current = null;
        };
    }, [isOpen, scanMode, safeStopScanner, handleSuccessfulScan]);

    const stopCamera = useCallback(async () => {
        isScannerRunning.current = false;
        if (scannerRef.current) {
            await safeStopScanner(scannerRef.current);
            scannerRef.current = null;
        }
        setIsScanning(false);
    }, [safeStopScanner]);

    const handleClose = useCallback(async () => {
        await stopCamera();
        setLastScanned(null);
        setCameraError(null);
        setIsOpen(false);
    }, [stopCamera, setIsOpen]);

    // Button mode - renders a scan button that opens dialog
    if (mode === "button") {
        return (
            <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                        variant="outline"
                        className={`relative gap-2 bg-zinc-900/50 border-zinc-700 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300 group ${className}`}
                        onClick={() => setIsOpen(true)}
                        title="Scan Barcode"
                    >
                        <motion.div
                            className="relative"
                            animate={{ rotate: [0, 0, 0] }}
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.4 }}
                        >
                            <ScanBarcode className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                        </motion.div>
                        <span className="text-zinc-400 group-hover:text-cyan-400 transition-colors">Scan</span>
                    </Button>
                </motion.div>

                <ScannerDialog
                    isOpen={isOpen}
                    onClose={handleClose}
                    scanMode={scanMode}
                    setScanMode={setScanMode}
                    isScanning={isScanning}
                    lastScanned={lastScanned}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                    cameraError={cameraError}
                    videoRef={videoRef}
                    placeholder={placeholder}
                    onImageUpload={handleImageUpload}
                    isProcessingImage={isProcessingImage}
                    imageError={imageError}
                    fileInputRef={fileInputRef}
                />
            </>
        );
    }

    // Dialog mode - controlled externally
    if (mode === "dialog") {
        return (
            <ScannerDialog
                isOpen={isOpen}
                onClose={handleClose}
                scanMode={scanMode}
                setScanMode={setScanMode}
                isScanning={isScanning}
                lastScanned={lastScanned}
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                cameraError={cameraError}
                videoRef={videoRef}
                placeholder={placeholder}
                onImageUpload={handleImageUpload}
                isProcessingImage={isProcessingImage}
                imageError={imageError}
                fileInputRef={fileInputRef}
            />
        );
    }

    // Inline mode - renders scanner directly
    return (
        <div className={`space-y-4 ${className}`}>
            <ScannerContent
                scanMode={scanMode}
                setScanMode={setScanMode}
                isScanning={isScanning}
                lastScanned={lastScanned}
                cameraError={cameraError}
                videoRef={videoRef}
                placeholder={placeholder}
                onImageUpload={handleImageUpload}
                isProcessingImage={isProcessingImage}
                imageError={imageError}
                fileInputRef={fileInputRef}
            />
        </div>
    );
}

// Animated gradient border component
function GradientBorder({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`relative p-px rounded-2xl overflow-hidden ${className}`}>
            <motion.div
                className="absolute inset-0 bg-linear-to-r from-primary via-emerald-500 to-primary"
                animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                }}
                style={{ backgroundSize: "200% 200%" }}
            />
            <div className="relative bg-background rounded-2xl">
                {children}
            </div>
        </div>
    );
}

// Pre-computed particle positions for stable rendering
const PARTICLE_CONFIG = [
    { x: "15%", scale: 0.6, duration: 3.5, delay: 0.5 },
    { x: "35%", scale: 0.8, duration: 4.2, delay: 1.2 },
    { x: "55%", scale: 0.5, duration: 3.8, delay: 0.8 },
    { x: "70%", scale: 0.9, duration: 4.5, delay: 1.8 },
    { x: "85%", scale: 0.7, duration: 3.2, delay: 0.3 },
    { x: "25%", scale: 0.65, duration: 4.0, delay: 1.5 },
];

// Floating particles effect
function FloatingParticles() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {PARTICLE_CONFIG.map((particle, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-primary/30 rounded-full"
                    initial={{
                        x: particle.x,
                        y: "100%",
                        scale: particle.scale,
                    }}
                    animate={{
                        y: "-10%",
                        opacity: [0, 1, 0],
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        delay: particle.delay,
                        ease: "easeOut",
                    }}
                />
            ))}
        </div>
    );
}

// Dialog wrapper component
function ScannerDialog({
    isOpen,
    onClose,
    scanMode,
    setScanMode,
    isScanning,
    lastScanned,
    soundEnabled,
    setSoundEnabled,
    cameraError,
    videoRef,
    placeholder,
    onImageUpload,
    isProcessingImage,
    imageError,
    fileInputRef,
}: {
    isOpen: boolean;
    onClose: () => void;
    scanMode: "usb" | "camera" | "image";
    setScanMode: (mode: "usb" | "camera" | "image") => void;
    isScanning: boolean;
    lastScanned: string | null;
    soundEnabled: boolean;
    setSoundEnabled: (enabled: boolean) => void;
    cameraError: string | null;
    videoRef: React.RefObject<HTMLDivElement | null>;
    placeholder: string;
    onImageUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isProcessingImage?: boolean;
    imageError?: string | null;
    fileInputRef?: React.RefObject<HTMLInputElement | null>;
}) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[520px] p-0 gap-0 border-0 bg-transparent shadow-2xl shadow-primary/10 overflow-hidden">
                <GradientBorder>
                    <div className="p-6 space-y-5">
                        {/* Header */}
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <motion.div 
                                    className="p-2.5 rounded-xl bg-linear-to-br from-primary/20 to-emerald-500/20 border border-primary/20"
                                    animate={{ 
                                        boxShadow: ["0 0 20px hsl(var(--primary) / 0.2)", "0 0 30px hsl(var(--primary) / 0.4)", "0 0 20px hsl(var(--primary) / 0.2)"]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <ScanBarcode className="w-5 h-5 text-primary" />
                                </motion.div>
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Barcode Scanner</h2>
                                    <p className="text-xs text-muted-foreground">Scan or upload barcode</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className="text-muted-foreground hover:text-foreground rounded-xl"
                            >
                                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            </Button>
                        </motion.div>

                        <ScannerContent
                            scanMode={scanMode}
                            setScanMode={setScanMode}
                            isScanning={isScanning}
                            lastScanned={lastScanned}
                            cameraError={cameraError}
                            videoRef={videoRef}
                            placeholder={placeholder}
                            onImageUpload={onImageUpload}
                            isProcessingImage={isProcessingImage}
                            imageError={imageError}
                            fileInputRef={fileInputRef}
                        />
                    </div>
                </GradientBorder>
            </DialogContent>
        </Dialog>
    );
}

// Mode tab data
const SCAN_MODES = [
    { id: "usb" as const, icon: Keyboard, label: "USB Scanner" },
    { id: "camera" as const, icon: Camera, label: "Camera" },
    { id: "image" as const, icon: Upload, label: "Upload" },
];

// Main scanner content component
function ScannerContent({
    scanMode,
    setScanMode,
    isScanning,
    lastScanned,
    cameraError,
    videoRef,
    placeholder,
    onImageUpload,
    isProcessingImage,
    imageError,
    fileInputRef,
}: {
    scanMode: "usb" | "camera" | "image";
    setScanMode: (mode: "usb" | "camera" | "image") => void;
    isScanning: boolean;
    lastScanned: string | null;
    cameraError: string | null;
    videoRef: React.RefObject<HTMLDivElement | null>;
    placeholder: string;
    onImageUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isProcessingImage?: boolean;
    imageError?: string | null;
    fileInputRef?: React.RefObject<HTMLInputElement | null>;
}) {
    return (
        <div className="space-y-4">
            {/* Sleek Mode Tabs */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative p-1 rounded-xl bg-muted/50 border border-border"
            >
                <div className="relative flex">
                    {/* Animated background pill */}
                    <motion.div
                        className="absolute inset-y-1 rounded-lg bg-linear-to-r from-primary/20 to-emerald-500/20 border border-primary/30"
                        layoutId="activeTab"
                        initial={false}
                        animate={{
                            left: scanMode === "usb" ? "0%" : scanMode === "camera" ? "33.33%" : "66.66%",
                            width: "33.33%",
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                    
                    {SCAN_MODES.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => setScanMode(mode.id)}
                            className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors z-10 ${
                                scanMode === mode.id 
                                    ? "text-primary" 
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <mode.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{mode.label}</span>
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Scanner Display Area */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="relative rounded-xl overflow-hidden bg-muted/30 border border-border"
            >
                <FloatingParticles />
                
                <AnimatePresence mode="wait">
                    <motion.div
                        key={scanMode}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {scanMode === "usb" && (
                            <USBScannerView placeholder={placeholder} />
                        )}
                        {scanMode === "camera" && (
                            <CameraScannerView
                                videoRef={videoRef}
                                isScanning={isScanning}
                                cameraError={cameraError}
                            />
                        )}
                        {scanMode === "image" && (
                            <ImageUploadView
                                onImageUpload={onImageUpload}
                                isProcessingImage={isProcessingImage}
                                imageError={imageError}
                                fileInputRef={fileInputRef}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </motion.div>
            
            {/* Hidden div for image scanning (required by html5-qrcode) */}
            <div id="barcode-image-scanner" className="hidden" />

            {/* Success Result - Beautiful animated card */}
            <AnimatePresence>
                {lastScanned && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-linear-to-r from-emerald-500/10 via-primary/10 to-emerald-500/10 rounded-xl" />
                        <motion.div
                            className="absolute inset-0 bg-linear-to-r from-transparent via-foreground/5 to-transparent"
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                        />
                        <div className="relative flex items-center gap-4 p-4 rounded-xl border border-emerald-500/30 backdrop-blur-sm">
                            <motion.div 
                                className="p-2.5 rounded-xl bg-emerald-500/20"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.1 }}
                            >
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                            </motion.div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-emerald-500">Barcode Detected!</p>
                                <p className="text-base font-mono text-foreground truncate mt-0.5">{lastScanned}</p>
                            </div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 px-3 py-1">
                                    ✓ Success
                                </Badge>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Tips */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 text-xs text-muted-foreground"
            >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>
                    {scanMode === "usb" 
                        ? "Connect scanner and scan any barcode" 
                        : scanMode === "camera"
                        ? "Position barcode in frame and hold steady"
                        : "Upload a clear image containing a barcode"
                    }
                </span>
            </motion.div>
        </div>
    );
}

// USB Scanner View - Futuristic design
function USBScannerView({ placeholder }: { placeholder: string }) {
    return (
        <div className="text-center py-10 px-4">
            {/* Animated scanner icon with rings */}
            <div className="relative w-28 h-28 mx-auto mb-6">
                {/* Outer pulse rings */}
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute inset-0 rounded-full border border-primary/30"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ 
                            scale: [0.8, 1.5],
                            opacity: [0.6, 0],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.6,
                            ease: "easeOut",
                        }}
                    />
                ))}
                
                {/* Inner glowing circle */}
                <motion.div
                    className="absolute inset-3 rounded-full bg-linear-to-br from-primary/20 to-emerald-500/20 border border-primary/40 flex items-center justify-center"
                    animate={{
                        boxShadow: [
                            "0 0 20px hsl(var(--primary) / 0.2), inset 0 0 20px hsl(var(--primary) / 0.1)",
                            "0 0 40px hsl(var(--primary) / 0.4), inset 0 0 30px hsl(var(--primary) / 0.2)",
                            "0 0 20px hsl(var(--primary) / 0.2), inset 0 0 20px hsl(var(--primary) / 0.1)",
                        ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.3), transparent)",
                        }}
                    />
                    <ScanBarcode className="w-10 h-10 text-primary relative z-10" />
                </motion.div>
            </div>

            {/* Text */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h3 className="text-lg font-semibold text-foreground mb-1">{placeholder}</h3>
                <p className="text-sm text-muted-foreground">
                    Connect your USB or Bluetooth scanner
                </p>
            </motion.div>

            {/* Animated scanning line */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-8 relative h-1.5 rounded-full overflow-hidden max-w-[200px] mx-auto bg-muted"
            >
                <motion.div
                    className="absolute h-full w-1/3 rounded-full bg-linear-to-r from-primary to-emerald-500"
                    animate={{ x: ["-100%", "400%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ boxShadow: "0 0 10px hsl(var(--primary) / 0.5)" }}
                />
            </motion.div>

            {/* Status indicator */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"
            >
                <motion.div
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span>Listening for scanner input...</span>
            </motion.div>
        </div>
    );
}

// Camera Scanner View - Sleek futuristic design
function CameraScannerView({
    videoRef,
    isScanning,
    cameraError,
}: {
    videoRef: React.RefObject<HTMLDivElement | null>;
    isScanning: boolean;
    cameraError: string | null;
}) {
    return (
        <div className="relative">
            {cameraError ? (
                <div className="text-center py-12 px-4">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center"
                    >
                        <AlertCircle className="w-8 h-8 text-destructive" />
                    </motion.div>
                    <h3 className="text-foreground font-medium mb-2">Camera Access Denied</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">{cameraError}</p>
                    <p className="text-xs text-muted-foreground/70 mt-4">
                        Allow camera access in your browser settings
                    </p>
                </div>
            ) : (
                <>
                    {/* Video container with styled border */}
                    <div className="relative rounded-xl overflow-hidden">
                        <div
                            id="barcode-scanner-video"
                            ref={videoRef}
                            className="w-full aspect-video bg-black"
                        />

                        {/* Scanning overlay */}
                        {isScanning && (
                            <div className="absolute inset-0 pointer-events-none">
                                {/* Darkened corners */}
                                <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/40" />
                                
                                {/* Scanning frame */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <motion.div 
                                        className="relative w-72 h-36"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        {/* Glowing border effect */}
                                        <div className="absolute inset-0 rounded-xl bg-linear-to-r from-primary/20 via-emerald-500/20 to-primary/20 blur-sm" />
                                        
                                        {/* Main frame */}
                                        <div className="absolute inset-0 rounded-xl border-2 border-emerald-400/60" 
                                            style={{ boxShadow: "0 0 30px rgba(16,185,129,0.2), inset 0 0 30px rgba(16,185,129,0.05)" }}
                                        />
                                        
                                        {/* Animated corner brackets */}
                                        <motion.div 
                                            className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-lg"
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        />
                                        <motion.div 
                                            className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-lg"
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                                        />
                                        <motion.div 
                                            className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-lg"
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                                        />
                                        <motion.div 
                                            className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-lg"
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                                        />

                                        {/* Scanning laser line */}
                                        <motion.div
                                            className="absolute left-3 right-3 h-[2px]"
                                            style={{
                                                background: "linear-gradient(90deg, transparent, hsl(var(--primary)), #10b981, hsl(var(--primary)), transparent)",
                                                boxShadow: "0 0 15px hsl(var(--primary) / 0.8), 0 0 30px hsl(var(--primary) / 0.4)",
                                            }}
                                            animate={{ top: ["15%", "85%", "15%"] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                    </motion.div>
                                </div>
                                
                                {/* Bottom hint */}
                                <motion.div 
                                    className="absolute bottom-4 left-0 right-0 text-center"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <span className="text-xs text-white bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                                        📷 Align barcode within frame
                                    </span>
                                </motion.div>
                            </div>
                        )}

                        {/* Loading state */}
                        {!isScanning && !cameraError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black">
                                <div className="text-center">
                                    <motion.div
                                        className="relative w-16 h-16 mx-auto mb-4"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    >
                                        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary" />
                                    </motion.div>
                                    <p className="text-sm text-white/70">Initializing camera...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// Image Upload Scanner View - Beautiful drag & drop design
function ImageUploadView({
    onImageUpload,
    isProcessingImage,
    imageError,
    fileInputRef,
}: {
    onImageUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isProcessingImage?: boolean;
    imageError?: string | null;
    fileInputRef?: React.RefObject<HTMLInputElement | null>;
}) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0 && onImageUpload) {
            const event = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;
            onImageUpload(event);
        }
    };

    return (
        <div className="py-6 px-4">
            {isProcessingImage ? (
                <div className="py-10 text-center">
                    {/* Processing animation */}
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        {/* Outer ring */}
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-primary/30"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                        {/* Middle ring */}
                        <motion.div
                            className="absolute inset-2 rounded-full border-2 border-emerald-500/30"
                            animate={{ rotate: -360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                        {/* Inner content */}
                        <div className="absolute inset-4 rounded-full bg-linear-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                <ScanBarcode className="w-8 h-8 text-primary" />
                            </motion.div>
                        </div>
                        {/* Scanning dots */}
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="absolute w-2 h-2 rounded-full bg-primary"
                                style={{
                                    top: "50%",
                                    left: "50%",
                                }}
                                animate={{
                                    x: [0, 40 * Math.cos((i * 120 * Math.PI) / 180)],
                                    y: [0, 40 * Math.sin((i * 120 * Math.PI) / 180)],
                                    opacity: [0, 1, 0],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                }}
                            />
                        ))}
                    </div>
                    
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <h3 className="text-lg font-semibold text-foreground mb-2">Analyzing Image...</h3>
                        <p className="text-sm text-muted-foreground">
                            Detecting barcode patterns
                        </p>
                    </motion.div>
                    
                    {/* Progress bar */}
                    <div className="mt-6 h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px] mx-auto">
                        <motion.div
                            className="h-full bg-linear-to-r from-primary to-emerald-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 3, ease: "easeInOut" }}
                        />
                    </div>
                </div>
            ) : (
                <>
                    {/* Drop zone */}
                    <motion.div
                        className={`relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group ${
                            isDragging 
                                ? "border-emerald-400 bg-emerald-500/10" 
                                : "border-border hover:border-primary/50 hover:bg-accent/50"
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef?.current?.click()}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        <input
                            type="file"
                            ref={fileInputRef as React.RefObject<HTMLInputElement>}
                            className="hidden"
                            accept="image/*"
                            onChange={onImageUpload}
                        />
                        
                        <div className="py-10 px-6 text-center">
                            {/* Icon */}
                            <motion.div 
                                className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-colors ${
                                    isDragging
                                        ? "bg-emerald-500/20 border border-emerald-500/40"
                                        : "bg-muted border border-border group-hover:border-primary/50"
                                }`}
                                animate={isDragging ? { scale: [1, 1.1, 1] } : {}}
                                transition={{ duration: 0.5, repeat: isDragging ? Infinity : 0 }}
                            >
                                {isDragging ? (
                                    <Upload className="w-7 h-7 text-emerald-500" />
                                ) : (
                                    <ImageIcon className="w-7 h-7 text-muted-foreground group-hover:text-primary" />
                                )}
                            </motion.div>
                            
                            {/* Text */}
                            <h3 className="text-foreground font-medium mb-1">
                                {isDragging ? "Drop image here" : "Upload barcode image"}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Drag & drop or click to browse
                            </p>
                            
                            {/* Upload button */}
                            <Button
                                type="button"
                                className="bg-linear-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-600 text-white border-0 rounded-xl px-6"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef?.current?.click();
                                }}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Select Image
                            </Button>
                            
                            {/* Supported formats */}
                            <p className="text-xs text-muted-foreground mt-4">
                                JPG, PNG, WebP • Max 10MB
                            </p>
                        </div>
                    </motion.div>

                    {/* Error message */}
                    <AnimatePresence>
                        {imageError && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -10, height: 0 }}
                                className="mt-4 overflow-hidden"
                            >
                                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                                    <div className="flex items-start gap-3">
                                        <div className="p-1.5 rounded-lg bg-destructive/20">
                                            <AlertCircle className="w-4 h-4 text-destructive" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-destructive mb-1">Detection Failed</p>
                                            <p className="text-xs text-muted-foreground whitespace-pre-line">{imageError}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Tips */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground"
                    >
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Clear image
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Good lighting
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Visible barcode
                        </span>
                    </motion.div>
                </>
            )}
        </div>
    );
}

export default BarcodeScanner;

