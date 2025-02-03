class AppService {
    private static instance: AppService | null = null;

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

    public async sendPrompt(prompt: string): Promise<any> {
        console.log(prompt);
        return;
    }
}

const appService = AppService.getInstance;

export default appService();
