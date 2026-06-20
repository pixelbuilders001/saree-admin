import axios from 'axios';

const API_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

// We use text/plain to avoid CORS preflight (OPTIONS) requests
// which Google Apps Script doesn't handle well with standard CORS headers.
export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'text/plain;charset=utf-8',
    },
});

// Helper for Google Apps Script requests using fetch for better CORS/Redirect support
export const gsRequest = async (action: string, data: any = {}) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action,
                ...data
            })
        });

        const result = await response.json();

        if (result && result.error) {
            throw new Error(result.error);
        }

        return result;
    } catch (error) {
        console.error(`Error in action ${action}:`, error);
        throw error;
    }
};
