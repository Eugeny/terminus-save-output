import * as fs from 'fs'
import { NgZone, Injectable } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { ElectronService, HostAppService } from 'terminus-core'
import { BaseTerminalTabComponent, TerminalContextMenuItemProvider } from 'terminus-terminal'
import { cleanupOutput } from './util'

import './styles.scss'

@Injectable()
export class SaveOutputContextMenu extends TerminalContextMenuItemProvider {
    weight = 1

    constructor (
        private zone: NgZone,
        private electron: ElectronService,
        private hostApp: HostAppService,
        private toastr: ToastrService,
    ) {
        super()
    }

    async getItems (tab: BaseTerminalTabComponent): Promise<Electron.MenuItemConstructorOptions[]> {
        return [
            {
                label: 'Save output to file...',
                click: () => {
                    this.zone.run(() => {
                        setTimeout(() => {
                            this.start(tab)
                        })
                    })
                }
            },
        ]
    }

    start (tab: BaseTerminalTabComponent) {
        if ((tab as any)._saveOutputActive) {
            return
        }

        let path = this.electron.dialog.showSaveDialogSync(
            this.hostApp.getWindow(),
            { defaultPath: 'terminal-log.txt' }
        )

        if (!path) {
            return
        }

        let ui: HTMLElement = document.createElement('div')
        ui.classList.add('save-output-ui')
        tab.element.nativeElement.querySelector('.content').appendChild(ui)
        ui.innerHTML = require('./ui.pug')

        let stream = fs.createWriteStream(path)

        let subscription = tab.output$.subscribe(data => {
            data = cleanupOutput(data)
            stream.write(data, 'utf8')
        })

        ;(tab as any)._saveOutputActive = true

        ui.querySelector('button').addEventListener('click', () => {
            (tab as any)._saveOutputActive = false
            tab.element.nativeElement.querySelector('.content').removeChild(ui)
            subscription.unsubscribe()
            stream.end()
            this.toastr.info('File saved')
        })
    }
}
