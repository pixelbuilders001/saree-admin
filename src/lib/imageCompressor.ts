/**
 * Compresses an image file using HTML5 Canvas.
 * If the image size is already under the threshold (default 300KB), it skips compression.
 */
export async function compressImage(file: File, maxSizeKB = 300, maxWidthOrHeight = 1200): Promise<File> {
    // Skip if the file size is already smaller than the max size
    if (file.size / 1024 <= maxSizeKB) {
        return file;
    }

    // Only compress image formats
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

                // Export to Blob with quality parameter (0.8 = 80% quality)
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        // Create a new File from the blob (force jpeg extension for better compression ratio)
                        let newName = file.name;
                        const lastDotIndex = file.name.lastIndexOf('.');
                        if (lastDotIndex !== -1) {
                            newName = file.name.substring(0, lastDotIndex) + '.jpg';
                        } else {
                            newName = file.name + '.jpg';
                        }

                        const compressedFile = new File([blob], newName, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    0.8
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
