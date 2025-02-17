import axios from 'axios';
import { API__BASE_URL, HistoryPromptItem } from '../constants';

class AppService {
    private static instance: AppService | null = null;
    private readonly CLIENT_API: string = `${API__BASE_URL}/client`;

    constructor() {
        if (AppService.instance) {
            return AppService.instance;
        }

        AppService.instance = this;
    }

    public static getInstance(): AppService {
        if (!AppService.instance) {
            AppService.instance = new AppService();
        }

        return AppService.instance;
    }

    public async sendPrompt(prompt: string): Promise<{ error: boolean; response: string }> {
        try {
            const response = await axios.post(`${this.CLIENT_API}/use-api`, prompt);
            const serverResponse = response.data;

            return {
                error: false,
                response: serverResponse,
            };
        } catch (error: any) {
            return {
                error: true,
                response: 'Something went wrong. Sorry :(',
            };
        }
    }

    public async getPromptHistory(): Promise<{
        error: boolean;
        promptHistory: HistoryPromptItem[];
        message: string;
    }> {
        try {
            const response = await axios.get(`${this.CLIENT_API}`);
            const serverResponse = response.data;
            console.log('serverResponse: ', serverResponse);

            return {
                error: false,
                promptHistory: serverResponse,
                message: 'Success',
            };
        } catch (error: any) {
            return {
                error: true,
                promptHistory: [],
                message: 'Something went wrong. Sorry :(',
            };
        }
    }
}

const appService = AppService.getInstance;

export default appService();
