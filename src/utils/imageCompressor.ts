/**
 * Utility function to compress images using HTML5 Canvas
 * @param file The file to compress
 * @param maxWidth Max width of the output image (default 1000px)
 * @param maxHeight Max height of the output image (default 1000px)
 * @param quality Quality of the output JPEG image (0.0 to 1.0, default 0.8)
 * @returns Promise that resolves to base64 Data URL
 */
export function compressImage(
    file: File,
    maxWidth = 1000,
    maxHeight = 1000,
    quality = 0.8
): Promise<string> {
    return new Promise((resolve, reject) => {
        // Only compress images
        if (!file.type.startsWith('image/')) {
            reject(new Error("File is not an image."));
            return;
        }

        // Gif uploads should not be compressed via canvas as it loses animation frames
        if (file.type === 'image/gif') {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Scale down if larger than max dimensions
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get 2D canvas context."));
                    return;
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Export to base64 jpeg
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
