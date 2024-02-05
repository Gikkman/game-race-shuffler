import {bindGet, bindPost} from '../Server'
import * as BizhawkService from './BizhawkService';
import * as Log from '@shared/Log';
let initialized = false;

export function init() {
    if(initialized) return;
    initialized = true;

    bindGet("/bizhawk", (req, res) => {
        let event = BizhawkService.peekBizhawkEventQueue();
        if(event) {
            let str = event.action + ":" + (event.path ? event.path : "");
            Log.info("<<< Sending " + str)
            res.send(str);
        }
        else
            res.send();
    });

    bindPost("/bizhawk", (req, res) => {
        let event = BizhawkService.popBizhawkEventQueue();
        res.send(event);
    });
    bindPost("/bizhawk/pong", (req, res) => {
        BizhawkService.bizhawkPong();
        res.send();
    });
}
