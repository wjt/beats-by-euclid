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

function intInRange(number, {value, min, max}) {
    number.set({value});
    number.min = min;
    number.max = max;
    number.step = 1;
    number.decimalPlaces = 0;
    return number
}

function rotate(l, k) {
    return l.slice(k, l.length).concat(l.slice(0, k));
}

class Pattern {
    constructor(k, length, notes, i, parent) {
        this.$el = document.createElement("div");
        this.$el.className = 'pattern';
        document.body.appendChild(this.$el);

        var r = addRow(this.$el);

        this._pulses = labelled("pulses", "number", r);
        intInRange(this._pulses, {
            value: Math.max(0, k),
            min: 0,
            max: length,
        });

        this._length = labelled("bar length", "number", r);
        intInRange(this._length, {
            value: Math.min(length, 64),
            min: 0,
            max: 64,
        });

        this._offset = labelled("rotate", "number", r);
        intInRange(this._offset, {
            value: 0,
            min: 0,
            max: length - 1,
        });

        this._pulses.on('*', ({value}) => {
            console.log("_pulses");
            this._update();
        })

        this._length.on('*', ({value}) => {
            console.log("_length");
            this._pulses.max = value;

            if (value < this._pulses.val.value) {
                this._pulses.set({value});
            }

            if (value <= this._offset.val.value) {
                this._offset.set({value: 0});
            }

            this._update();
        });

        this._offset.on('*', ({value}) => {
            console.log("_offset", value);
            this._update();
        });

        // TODO: just use a real select, come on
        var s1 = nx.add('select', {parent: r});
        s1.choices = _.pluck(notes, 'label');
        s1.init();

        var remove = document.createElement('button');
        remove.innerHTML = '×';
        remove.addEventListener('click', () => this.remove(), false);
        r.appendChild(remove);

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

    remove() {
        this.$el.parentNode && this.$el.parentNode.removeChild(this.$el);
        this.onremove && this.onremove();
    }

    _update() {
        console.log("update");
        var k = this._pulses.val.value;
        var length = this._length.val.value;
        var m = length - k;
        var offset = this._offset.val.value;
        var pattern = {k, m, offset};

        if (!_.isEqual(pattern, this.pattern)) {
            console.log(pattern);
            this.pattern = pattern;

            const seqs = new Sequence(this.pattern).evaluate()
                .map(x => rotate(x.toBools(), offset));
            let rows = seqs.length;
            let cols = seqs[0].length;

            this.loop = seqs[seqs.length - 1];
            var mx = this.mx;
            mx.row = rows;
            mx.col = cols;
            mx.init();
            mx.resize(cols * cellSize, rows * cellSize);

            seqs.forEach((seq, row) => {
                seq.forEach((c, col) => {
                    mx.matrix[col][row] = +c;
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

    get pulses() {
        return this.pattern.k;
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
    const notes = _.flatten([
        drumSampleNames.map(note => ({instrument: 'kit', note})),
        // synthNoteNames.map(note => ({instrument: 'bloop', note}))
    ]);

    notes.forEach(x => {
        x.label = x.note; // `${x.instrument} - ${x.note}`;
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

function pickFresh(start, end, avoid=[]) {
    var xs = _.range(start, end).filter(i => avoid.indexOf(i) === -1);
    if (xs.length) {
        return _.sample(xs);
    } else {
        return _.random(start, end - 1);
    }
}

const {notes, synths} = getSynths();

window.nx.onload = function onload() {
    Tone.Buffer.on('load', () => {
        var r = addRow(document.body);
        var playPauseButton = nx.add('toggle', {parent: r})
        function setPlaying(playing) {
            if (+playing !== playPauseButton.val.value) {
                playPauseButton.set({value: +playing}, true);
            }
        }

        var bpm = labelled("BPM", "number", r);
        bpm.min = 80;
        bpm.max = 200;
        bpm.step = 1;
        bpm.decimalPlaces = 0;
        bpm.on('*', () => {
            Tone.Transport.bpm.value = bpm.val.value;
        });
        bpm.set({value: 152}, true);

        var addPatternButton = document.createElement('button');
        addPatternButton.innerHTML = 'Add pattern';
        r.appendChild(addPatternButton);

        var patterns = [];

        function appendPattern(k, length, i) {
            var p = new Pattern(k, length, notes, i);
            p.onremove = () => {
                patterns.splice(patterns.indexOf(p), 1);
                patterns.length || setPlaying(false);
            };
            patterns.push(p);
        }

        addPatternButton.addEventListener('click', () => {
            var k = 5;
            var length = 16;
            var i = 0;
            if (patterns.length) {
                length = _.max(_.pluck(patterns, 'length'));
                // even better: pick something coprime with as many as possible
                k = pickFresh(1, Math.ceil(length * 2 / 3),
                    _.pluck(patterns, 'pulses'));
                i = pickFresh(0, notes.length, _.pluck(patterns, 'index'));
            } else {
                setPlaying(true);
            }
            appendPattern(k, length, i);
        }, false);

        var clearPatternsButton = document.createElement('button');
        clearPatternsButton.innerHTML = 'Clear patterns';
        clearPatternsButton.addEventListener('click', () => {
            patterns.slice().forEach(p => p.remove());
            setPlaying(false);
            n = 0;
        }, false);
        r.appendChild(clearPatternsButton);

        var n = -1;
        var tick = (time) => {
            if (n >= 0) {
                patterns.forEach(p => {
                    if (n >= 0 && p.tick(n)) {
                        var s = synths[p.instrument];
                        s.triggerAttackRelease(p.note, "8n", time);
                    }
                });
            }

            n += 1;
        };

        var eventId;
        playPauseButton.on('*', ({value}) => {
            if (value && eventId === undefined) {
                eventId = Tone.Transport.scheduleRepeat(tick, "8n");
            } else if (eventId !== undefined){
                Tone.Transport.clear(eventId);
                eventId = undefined;
            }
        });
        Tone.Transport.start();

        appendPattern(5, 16, 0);
        appendPattern(3, 16, 1);
        appendPattern(7, 16, 4);
        setPlaying(true);
    });
};
