import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { join } from 'path/win32';

// Remember to rename these classes and interfaces!

interface GmweSettings {
	publish_by_default: boolean;
	publish_property: string
	never_public_paths: Array<string>
}

const DEFAULT_SETTINGS: GmweSettings = {
	publish_by_default: false,
	publish_property: "Publish",
	never_public_paths: [ "compendium/" ] 
}

export default class GmwePlugin extends Plugin {
	settings: GmweSettings;
	fmap: Map<TFile,number>; // -1 = don't publish, 0=allowed, not needed, >0 = publish

	async onload() {
		await this.loadSettings()
		this.fmap = new Map()

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'GM Web Export', (evt: MouseEvent) => {
			const files = this.app.vault.getMarkdownFiles()

			let toproc = new Array()
			// First pass, run through all the files and look at their marked states
			for (let i = 0; i < files.length; i++) {
				let f = this.updatePublishState(files[i])

				for ( let j = 0; j < f.length; j++ ) {
					console.log( files[i].path + " Added " + f[j].path )
				}
				toproc = toproc.concat(f)
			}


			// Second pass, for files definitly will publish follow the links around
			//while ( toproc.length > 1 ) {
			//	let e = toproc.pop()
			//	console.log("Processing = " + e.path)
			//	let nvals = this.updateLinkedPublishStates(e)
			//	if ( nvals.length > 0 ) {
			//		console.log("Adding = " + nvals)
			//		toproc = toproc.concat(nvals)
			//	}
			//}	

			// Called when the user clicks the icon.
			//new Notice("Publishing " + flist.length + " files");
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new GmweSettingTab(this.app, this));
	}

	onunload() {

	}

	updatePublishState(f : TFile, islinked: boolean=false) {
		const pubkeyword = this.settings.publish_property

		const origpubstate = this.fmap.get(f)
		let pubstate = origpubstate

		// If there is no pre-existing entry, take a closer look
		if ( pubstate === undefined ) {
			// We don't even need to look if they are in an excluded directory
			for ( let i = 0; i < this.settings.never_public_paths.length; i++ ) {
				if (f.path.startsWith(this.settings.never_public_paths[i])) {
					pubstate = -1;
				}
			}

			// If we didn't get ruled out that way, check the publish properties
			if ( pubstate === undefined ) {
				const fm = this.app.metadataCache.getFileCache(f)?.frontmatter			
				if ( fm === undefined || ! fm[pubkeyword] ) {
					pubstate = 0
				} else {
					const rpstate = fm[pubkeyword].toLowerCase()
					if ( rpstate == "no" ) {
						pubstate = -1
					} else if ( rpstate == "yes" ) {
						pubstate = 1
					} else {
						pubstate = 0
					}
				}
			}
		}

		if ( pubstate == 0 && islinked ) {
			pubstate = 1;
		}

		let answer = new Array()
		if ( pubstate != origpubstate ) {
			this.fmap.set(f, pubstate)
			if ( pubstate > 0 ) {
				console.log("Investigating " + f.path)
				answer = this.updateLinkedPublishStates(f)
			}
		} 

		return answer
	}

	updateLinkedPublishStates(f : TFile) {
		const lnks = this.app.metadataCache.getFileCache(f)?.links
		let newflist = new Array()

		if ( lnks != undefined ) {
			for (let i = 0; i < lnks.length; i++) {
				const metaVariant = this.app.metadataCache.getFirstLinkpathDest(lnks[i].link, f.path)
				if ( metaVariant != undefined ) {
					let tchanged = this.updatePublishState(metaVariant, true)
					let fliststr = ""
					for ( let j = 0; j < tchanged.length; j++ ) {
						fliststr = fliststr + tchanged[j].path + ", "
					}
					//console.log( f.path + ", " + metaVariant.path + " links discovered :" + fliststr)
								
					if ( this.willPublish(metaVariant) ) {
						for ( let j = 0; j < tchanged.length; j++ ) {
							if ( this.willPublish(tchanged[j])) {
								newflist.push(tchanged[j])
							}
						}
					}
				}
			}
		}
		return newflist
	} 

	canPublish(f: TFile) {
		const v = this.fmap.get(f)
		return ( v != undefined && v >= 0 );
	}
	mustPublish(f : TFile) {
		const v = this.fmap.get(f)
		return ( v != undefined && v > 0 );
	}
	willPublish(f : TFile) {
		const v = this.fmap.get(f)
		const pbd = this.settings.publish_by_default
		return ( ( pbd && v != -1 ) || ( v != undefined && v > 0 ) )
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
			.setName('Assume Publish?')
			.setDesc('If true, publish anything not marked no. If false, publish only marked yes')
			.addToggle(toggle => toggle.setValue(this.plugin.settings.publish_by_default)
                .onChange((value) => {
                    this.plugin.settings.publish_by_default = value;
                    this.plugin.saveData(this.plugin.settings);
                }));
	}
}
