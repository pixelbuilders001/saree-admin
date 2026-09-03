/**
 * Compresses and converts an image file to WebP format using HTML5 Canvas.
 */
export async function compressImage(
    file: File,
    maxSizeKB = 300,
    maxWidthOrHeight = 1200,
    outputType: 'image/webp' | 'image/jpeg' = 'image/webp'
): Promise<File> {
    const ext = outputType === 'image/webp' ? '.webp' : '.jpg';
    const isAlreadyTargetType = file.type === outputType;

    // Only skip if already target format AND size is within limits
    if (isAlreadyTargetType && file.size / 1024 <= maxSizeKB) {
        return file;
    }

    // Only process image formats
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions keeping the aspect ratio
                if (width > height) {
                    if (width > maxWidthOrHeight) {
                        height = Math.round((height * maxWidthOrHeight) / width);
                        width = maxWidthOrHeight;
                    }
                } else {
                    if (height > maxWidthOrHeight) {
                        width = Math.round((width * maxWidthOrHeight) / height);
                        height = maxWidthOrHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Export to WebP Blob (0.85 quality for webp gives excellent visual quality and small size)
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        let baseName = file.name;
                        const lastDotIndex = file.name.lastIndexOf('.');
                        if (lastDotIndex !== -1) {
                            baseName = file.name.substring(0, lastDotIndex);
                        }
                        const newName = `${baseName}${ext}`;

                        const compressedFile = new File([blob], newName, {
                            type: outputType,
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    outputType,
                    0.85
                );
            };
            img.onerror = () => {
                resolve(file); // Fallback to original file on error
            };
        };
        reader.onerror = () => {
            resolve(file); // Fallback to original file on error
        };
    });
}
