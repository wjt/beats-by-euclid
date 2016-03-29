import _ from "lodash";

function times(n, s) {
    return Array(n + 1).join(s);
};

export class Sequence {
    /*
     * k: number of 'one's
     * m: number of 'zero's
     */
    constructor({k, m, one = '1', zero = '0'}) {
        Object.assign(this, {k, m, one, zero});
    }

    get length() {
        let {k, m, one, zero} = this;

        return (k * one.length) + (m * zero.length);
    }

    toString(bracket = true) {
        let {k, m, one, zero} = this;

        if (bracket) {
            one = `[${one}]`;
            zero = `[${zero}]`;
        }

        return times(k, one) + times(m, zero);
    }

    toBools(one = '1') {
        return _.map(this.toString(false), x => x === one);
    }

    step() {
        let {k, m, one, zero} = this;

        if (k <= 1 || m <= 1) {
            return this;
        } else if (m > k) {
            return new this.constructor({k, m: m - k, one: one + zero, zero});
        } else if (m === k) {
            return new this.constructor({k, m: 0, one: one + zero, zero: ''});
        } else {
            return new this.constructor({k: m, m: k - m, one: one + zero, zero: one});
        }
    }

    evaluate() {
        var steps = [this];
        var s = this;
        var t;
        while ((t = s.step()) !== s) {
            steps.push(t);
            s = t;
        }
        return steps;
    }
};
