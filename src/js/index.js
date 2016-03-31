import Tone from "tone";

import _nx from "nexusui";
const nx = window.nx;

import _ from "lodash";

import {Sequence} from "./sequence";

const cellSize = 20;

function addRow(parent) {
    var r = document.createElement('div');
    r.id = _.uniqueId("row_");
    r.className = 'row';
    parent.appendChild(r);
    return r;
}

function comment(text, parent) {
    var c = nx.add('comment', {parent});
    c.setSize(12);
    c.val.text = text;
    c.draw();
    return c;
}

function labelled(text, type, parent) {
    var r = addRow(parent);
    comment(text, r);
    return nx.add('number', {parent: r});
}

class Pattern {
    constructor(k, length, notes, i, parent) {
        this.$el = document.createElement("div");
        this.$el.className = 'pattern';
        document.body.appendChild(this.$el);

        var r = addRow(this.$el);

        var n1 = this.n1 = labelled("pulses", "number", r);
        n1.set({
            value: Math.max(0, k)
        });
        n1.min = 0;
        n1.max = length;
        n1.step = 1;
        n1.decimalPlaces = 0;

        var n2 = this.n2 = labelled("bar length", "number", r);
        n2.set({
            value: Math.min(length, 64),
        })
        n2.min = 0;
        n2.max = 64;
        n2.step = 1;
        n2.decimalPlaces = 0;

        n1.on('*', ({value}) => {
            console.log("n1");
            this._update();
        })

        n2.on('*', ({value}) => {
            console.log("n2");
            n1.max = value;

            if (value < n1.val.value) {
                n1.set({
                    value
                });
            } else {
                this._update();
            }
        });

        // TODO: just use a real select, come on
        var s1 = nx.add('select', {parent: r});
        s1.choices = _.pluck(notes, 'label');
        s1.init();

        this._notes = notes;
        this._index = i;
        s1.canvas.selectedIndex = i;
        s1.on('*', () => {
            this._index = s1.canvas.selectedIndex
        });

        this.mx = nx.add('matrix', {parent: this.$el});

        this.pattern = {};
        this.loop = [];

        this._update();
    }

    _update() {
        var k = this.n1.val.value;
        var m = this.n2.val.value - k;
        var pattern = {k, m};

        if (!_.isEqual(pattern, this.pattern)) {
            this.pattern = pattern;

            const seqs = new Sequence(this.pattern).evaluate();
            let rows = seqs.length;
            let cols = seqs[0].length;

            this.loop = seqs[seqs.length - 1].toBools();

            var mx = this.mx;
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

    tick(n) {
        var i = n % this.loop.length;
        this.mx.jumpToCol(i);
        return this.loop[i];
    }

    get index() {
        return this._index;
    }

    get note() {
        return this._notes[this._index].note;
    }

    get instrument() {
        return this._notes[this._index].instrument;
    }

    get length() {
        return this.pattern.k + this.pattern.m;
    }
}

function getSynths() {
    const drumSampleURLs = {
        Kick: "/samples/Kick.mp3",
        Snare: "/samples/Sample 1.mp3",
        Cymbal: {
            Crash: "/samples/Crash Cymbal.mp3",
            Ride: "/samples/Ride Cymbal.mp3",
        },
        HH: {
            Closed: "/samples/Closed Hat.mp3",
            Mid: "/samples/Mid Hat.mp3",
            Open1: "/samples/Open Hat 1.mp3",
            Open2: "/samples/Open Hat 2.mp3",
        },
        Tom: {
            High: "/samples/Sample 2.mp3",
            Mid: "/samples/Mid Tom.mp3",
            Floor: "/samples/Floor Tom.mp3",
        },
    }
    const drumSampleNames = Object.keys(Tone.Sampler.prototype._flattenUrls(drumSampleURLs));
    const synthNoteNames = ["Eb3", "G3", "Bb3", "C4"];
    const notes = [].concat(
        drumSampleNames.map(note => ({instrument: 'kit', note})),
        synthNoteNames.map(note => ({instrument: 'bloop', note}))
    );
    notes.forEach(x => {
        x.label = `${x.instrument} - ${x.note}`;
    });

    var bloop = new Tone.PolySynth(synthNoteNames.length, Tone.MonoSynth, {
        "oscillator" : {
            "partials": [7, 3, 2, 1],
            "type": "custom",
            "frequency": "C#4",
            "volume": -8,
        },
        "envelope" : {
            "attack" : 0.11,
            "decay" : 0.21,
            "sustain" : 0.59,
            "release" : 1.2,
        }
    }).toMaster();

    var kit = new Tone.PolySynth(drumSampleNames.length, Tone.Sampler, drumSampleURLs, {
        volume: -10,
    }).toMaster();

    var synths = {bloop, kit};
    return {notes, synths};
};

const {notes, synths} = getSynths();

window.nx.onload = function onload() {
    Tone.Buffer.on('load', () => {
        Tone.Transport.bpm.value = 144;

        var r = addRow(document.body);
        var playPause = nx.add('toggle', {parent: r})

        var bpm = labelled("BPM", "number", r);
        bpm.min = 80;
        bpm.max = 200;
        bpm.step = 1;
        bpm.decimalPlaces = 0;
        bpm.set({
            value: Tone.Transport.bpm.value
        });
        bpm.on('*', () => {
            Tone.Transport.bpm.value = bpm.val.value;
        });

        var addPattern = document.createElement('button');
        addPattern.innerHTML = 'Add pattern';
        r.appendChild(addPattern);

        var patterns = [
            new Pattern(5, 16, notes, 0),
            new Pattern(7, 16, notes, 4),
        ];

        addPattern.addEventListener('click', () => {
            var length = _.max(_.pluck(patterns, 'length'));
            var k = _.random(1, length);
            var i = _.random(0, notes.length - 1);
            patterns.push(new Pattern(k, length, notes, i));
        }, false);

        var n = 0;
        var tick = (time) => {
            patterns.forEach(p => {
                if (p.tick(n)) {
                    var s = synths[p.instrument];
                    s.triggerAttackRelease(p.note, "8n", time);
                }
            });

            n += 1;
        };

        var eventId;
        playPause.on('*', ({value}) => {
            if (value) {
                eventId = Tone.Transport.scheduleRepeat(tick, "8n");
            } else {
                Tone.Transport.clear(eventId);
            }
        });
        Tone.Transport.start();
    });
};
