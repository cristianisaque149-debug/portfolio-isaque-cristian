const UserData = {
    STORAGE_KEY: 'md_multi_instance_v2',
    SETTINGS_KEY: 'md_settings',

    getAllData: () => {
        const data = localStorage.getItem(UserData.STORAGE_KEY);
        return data ? JSON.parse(data) : { activeId: null, files: {} };
    },

    saveAllData: (data) => {
        localStorage.setItem(UserData.STORAGE_KEY, JSON.stringify(data));
    },

    getSettings: () => {
        const settings = localStorage.getItem(UserData.SETTINGS_KEY);
        return settings ? JSON.parse(settings) : { autosave: true };
    },

    saveSettings: (settings) => {
        localStorage.setItem(UserData.SETTINGS_KEY, JSON.stringify(settings));
    }
};