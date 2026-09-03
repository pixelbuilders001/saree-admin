export interface ImageKitUploadResponse {
    fileId: string;
    name: string;
    size: number;
    filePath: string;
    url: string;
    fileType: string;
    height?: number;
    width?: number;
    thumbnailUrl?: string;
}

/**
 * Uploads a file directly to ImageKit using the ImageKit Upload REST API.
 * Uses HTTP Basic Authentication with VITE_IMAGEKIT_PRIVATE_KEY.
 */
export async function uploadToImageKit(
    file: File | Blob,
    fileName: string,
    folder: string = '/hero-banners'
): Promise<ImageKitUploadResponse> {
    const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
    const privateKey = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY;

    if (!privateKey || privateKey.includes('your_') || privateKey.includes('...')) {
        throw new Error(
            'ImageKit Private Key is missing or invalid. Please configure VITE_IMAGEKIT_PRIVATE_KEY in your .env file.'
        );
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('folder', folder);
    formData.append('useUniqueFileName', 'true');
    if (publicKey && !publicKey.includes('your_')) {
        formData.append('publicKey', publicKey);
    }

    // Basic Auth header using ImageKit Private Key: `privateKey:`
    const authHeader = 'Basic ' + btoa(`${privateKey}:`);

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        headers: {
            Authorization: authHeader,
        },
        body: formData,
    });

    if (!response.ok) {
        let errorMessage = `ImageKit upload failed (${response.status} ${response.statusText})`;
        try {
            const errorJson = await response.json();
            if (errorJson.message) {
                errorMessage = `ImageKit Error: ${errorJson.message}`;
            }
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errorMessage);
    }

    const result: ImageKitUploadResponse = await response.json();
    return result;
}
