import Tone from "tone";

import _nx from "nexusui";
const nx = window.nx;

import {Sequence} from "./sequence";

const cellSize = 20;

function comment(text) {
    var c = nx.add('comment');
    c.val.text = text;
    c.draw();
    return c;
}

function addPattern(k, m, note) {
    comment('pulses');

    var n1 =  nx.add('number');
    n1.set({
        value: Math.max(0, k)
    });
    n1.min = 0;
    n1.max = m;
    n1.step = 1;
    n1.decimalPlaces = 0;

    comment('bar length');
    var n2 = nx.add('number');
    n2.set({
        value: Math.min(m, 64),
    })
    n2.min = 0;
    n2.max = 64;
    n2.step = 1;
    n2.decimalPlaces = 0;

    n1.on('*', ({value}) => {
        console.log("n1");
        update();
    })

    n2.on('*', ({value}) => {
        console.log("n2");
        n1.max = value;

        if (value < n1.val.value) {
            n1.set({
                value
            });
        } else {
            update();
        }
    });

    var pattern = {};
    var mx = nx.add('matrix');
    var loop = [];
    update();

    function update() {
        var k = n1.val.value;
        var m = n2.val.value - k;

        if (pattern.k !== k || pattern.m !== m) {
            pattern = {k, m};

            const seqs = new Sequence(pattern).evaluate();
            let rows = seqs.length;
            let cols = seqs[0].length;

            loop.splice(0, loop.length, ...seqs[seqs.length - 1].toBools());

            mx.row = rows;
            mx.col = cols;
            mx.init();
            mx.resize(cols * cellSize, rows * cellSize);

            seqs.forEach((seq, row) => {
                seq.toBools().forEach((c, col) => {
                    mx.matrix[col][row] = c ? 1 : 0;
                });
            })
            mx.draw();
        }
    }

    return loop;
}

window.nx.onload = function onload() {
    var synth = new Tone.PolySynth(6, Tone.MonoSynth).toMaster();

    var p1 = addPattern(5, 16);
    var p2 = addPattern(7, 15);

    var n = 0;
    Tone.Transport.scheduleRepeat((time) => {
        var chord = [];
        if (p1[n % p1.length]) {
            chord.push("C4");
        }
        if (p2[n % p2.length]) {
            chord.push("G4");
        }
        if (chord.length) {
            synth.triggerAttackRelease(chord, "16n")
        }

        n += 1;
    }, "8n");
};

window.addEventListener('load', () => {
    Tone.Transport.start();
}, false);

window.Euclid = {
    Sequence,
    nx,
};
