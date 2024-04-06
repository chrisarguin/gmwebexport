import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface GmweSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: GmweSettings = {
	mySetting: 'default'
}

export default class GmwePlugin extends Plugin {
	settings: GmweSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'GM Web Export', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Welcome to GM Web Export!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new GmweSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class GmweSettingTab extends PluginSettingTab {
	plugin: GmwePlugin;

	constructor(app: App, plugin: GmwePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
