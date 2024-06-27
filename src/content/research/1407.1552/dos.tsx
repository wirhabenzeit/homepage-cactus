/** @jsxImportSource @builder.io/qwik */

import {
	component$,
	useSignal,
	useComputed$,
	noSerialize,
	useVisibleTask$,
} from "@builder.io/qwik";
import * as Plot from "@observablehq/plot";
import * as d3 from "d3";

import { sqrt, pow, pi, add, abs, dotPow, dotMultiply, exp, map } from "mathjs";
import { Chart } from "src/components/plot";
import { Range } from "src/components/inputs";

const vPos = (q: number, x: number[], n = 20) => {
	if (q == 0)
		return dotMultiply((2 * pi) ** -1, dotPow(add(4, dotMultiply(-1, dotPow(x, 2))), 0.5));
	if (q == 1) return dotMultiply((2 * pi) ** -0.5, map(dotMultiply(-1 / 2, dotPow(x, 2)), exp));

	let result = dotMultiply(
		sqrt(1 - q) / pi,
		dotPow(add(dotMultiply(dotPow(x, 2), -(1 - q) / 4), 1), -0.5),
	);

	for (let k = 0; k <= n; k++) {
		const term = dotMultiply(
			add(1, dotMultiply(-1 * pow(1 + pow(q, k), -2) * (1 - q) * pow(q, k), dotPow(x, 2))),
			(1 - pow(q, 2 * k + 2)) / (1 - pow(q, 2 * k + 1)),
		);
		result = dotMultiply(result, term);
	}

	return result;
};

const linspace = (start, stop, nsteps) => {
	const delta = (stop - start) / (nsteps - 1);
	return d3.range(nsteps).map((i) => start + i * delta);
};

export const v = (q: number, xall: number[], n = 20) => {
	const filter = (y: number) => (q > 0 ? abs(y) < 2 / (1 - q) ** 0.5 : true);
	const result = vPos(q, xall.filter(filter), n);
	const ys: number[] = [];
	let i = 0;
	xall.forEach((y) => {
		if (filter(y)) {
			ys.push(result[i]!);
			i++;
		} else {
			ys.push(0);
		}
	});
	return ys;
};

const n = 50;
const qs = d3.scaleLinear().domain([0.01, 0.9]).ticks(30);

const data = qs.concat([0, 1]).flatMap((q) => {
	const edge = q < 0.6 ? 2 / (1 - q) ** 0.5 : 3;
	const x = linspace(-edge, edge, 51);
	const y = v(q, x, n);
	return x.map((x, i) => ({ x, y: y[i], q }));
});

const plotOptions = ({ q, ...opts }) => {
	return {
		marks: [
			Plot.line(
				data.filter((x) => abs(x.q - q) < 1e-3 || x.q == 0 || x.q == 1),
				{
					x: "x",
					y: "y",
					stroke: (x) =>
						x.q == 0 ? "semicircle" : x.q == 1 ? "normal" : `ρ( · ,${x.q.toFixed(2)})`,
				},
			),
			Plot.ruleY([0]),
		],
		y: { domain: [0.0, 0.4], label: null },
		x: { domain: [-3, 3], label: null },
		color: { type: "categorical", legend: true },
		grid: true,
		...opts,
	};
};

export const DOS = component$(({}) => {
	const q = useSignal(qs[15]!);

	const chartOptions = useComputed$(() =>
		noSerialize(plotOptions({ q: q.value, width: 832, height: 400 })),
	);
	return (
		<div>
			<Range
				values={qs}
				value={q}
				autoplay={false}
				loop={true}
				delay={30}
				label$={(value: number) => `q = ${value == undefined ? "" : value.toFixed(2)}`}
			/>
			<Chart options={chartOptions} class="-mt-5" />
		</div>
	);
});

export const Hero = component$(({ width, height, classList }) => {
	const idx = useSignal(0);
	const playing = useSignal(false);

	useVisibleTask$(({ track }) => {
		track(() => idx.value);
		track(() => playing.value);
		if (playing.value) {
			const interval = setInterval(() => {
				idx.value = (idx.value + 1) % qs.length;
			}, 100);
			return () => clearInterval(interval);
		}
	});

	const chartOptions = useComputed$(() =>
		noSerialize(
			plotOptions({
				q: qs[idx.value],
				width,
				height,
			}),
		),
	);
	return (
		<div onMouseEnter$={() => (playing.value = true)} onMouseLeave$={() => (playing.value = false)}>
			<Chart options={chartOptions} class={classList.join(" ")} />
		</div>
	);
});
