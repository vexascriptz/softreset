import type { DiagnosticTree, MeasureOutcome, Observation } from './types';

const GPU_SATURATED = 95;
const GPU_HEADROOM = 80;
const CPU_BUSY = 70;
const STUTTER_RATIO = 0.6;

export const gamingLowFps: DiagnosticTree = {
  problemId: 'gaming-low-fps',
  title: 'Low frame rate, stutter, or frame-time spikes in games',
  intro:
    'The customer reports poor game performance. This workflow separates a low average from stutter, then checks whether the GPU or the CPU is the limit before recommending any change.',
  estimatedMinutes: 35,
  start: 'setup',
  nodes: {
    setup: {
      type: 'checklist',
      id: 'setup',
      title: 'Record the setup before measuring',
      why: 'A frame-rate number means nothing without the settings and scene behind it. Record them now so every later change can be compared against this exact baseline.',
      items: [
        'Game name, version, and graphics preset.',
        'Resolution, refresh rate, and any frame cap, V-Sync, or variable refresh (G-Sync or FreeSync) setting.',
        'Upscaling or frame generation setting, if the game has one.',
        'A repeatable scene: a built-in benchmark, or a fixed route with a start and an end point.',
        'Other programs running in the background that the customer cannot close.',
      ],
      next: 'symptom',
    },
    symptom: {
      type: 'choice',
      id: 'symptom',
      title: 'What the customer actually sees',
      why: 'A low average and a stutter have different causes. The customer’s description tells you which pattern to look for in the frame data.',
      prompt: 'Which symptom does the customer describe?',
      answerKey: 'symptom',
      options: [
        { label: 'Low frame rate all the time', value: 'low-average', next: 'capture' },
        { label: 'Smooth on average, but stutters or freezes briefly', value: 'stutter', next: 'capture' },
        { label: 'Both', value: 'both', next: 'capture' },
      ],
    },
    capture: {
      type: 'measure',
      id: 'capture',
      title: 'Frame capture and hardware load',
      why: 'Average frame rate hides stutter. The 1% low and the frame-time spikes show it. The GPU and CPU load during the same capture show which component is the limit.',
      instructions: [
        'Start the capture in CapFrameX, or another PresentMon-based tool, just before entering the scene.',
        'Run the same scene for 60 seconds. Repeat it three times and keep all three results.',
        'In HWiNFO64 (Sensors-only mode), note the average GPU utilization and the average CPU utilization over the same window.',
        'Enter the values from the run you consider most representative, then note the other two runs in the session notes.',
      ],
      softwareIds: ['capframex', 'hwinfo64'],
      fields: [
        { key: 'avg-fps', label: 'Average frame rate', unit: 'fps', hint: 'Average over the capture.', min: 1, max: 1000, metric: 'avg-fps' },
        { key: 'low-1pct-fps', label: '1% low frame rate', unit: 'fps', hint: 'Frame rate of the slowest 1% of frames.', min: 1, max: 1000, metric: 'low-1pct-fps' },
        { key: 'frametime-ms', label: 'Average frame time', unit: 'ms', hint: 'Average time between frames.', min: 1, max: 1000, metric: 'frametime-ms' },
        { key: 'gpu-util-pct', label: 'GPU utilization', unit: '%', hint: 'Average over the capture window.', min: 0, max: 100 },
        { key: 'cpu-util-pct', label: 'CPU utilization', unit: '%', hint: 'Overall average over the capture window.', min: 0, max: 100 },
      ],
      basis:
        'Starting points: a 1% low below about 60% of the average points to stutter. GPU utilization at or above 95% means the GPU is saturated. Below 80% GPU with CPU at 70% or more suggests the processor is limiting. Overall CPU averages can hide one saturated thread, so check per-core load before concluding.',
      interpret: (v, a): MeasureOutcome => {
        const avg = v['avg-fps'] ?? 0;
        const low = v['low-1pct-fps'] ?? 0;
        const gpu = v['gpu-util-pct'] ?? 0;
        const cpu = v['cpu-util-pct'] ?? 0;
        const ratio = avg > 0 ? low / avg : 1;
        const stutter = ratio < STUTTER_RATIO;
        const observations: Observation[] = [];

        observations.push({
          level: stutter ? 'notice' : 'info',
          text: stutter
            ? `The 1% low (${low} fps) is ${Math.round(ratio * 100)}% of the average (${avg} fps). Frame times spike, which is a stutter pattern, not only low speed.`
            : `The 1% low (${low} fps) is ${Math.round(ratio * 100)}% of the average (${avg} fps). Frame pacing is not the main issue in this run.`,
        });

        if (stutter && (a.symptom === 'stutter' || a.symptom === 'both')) {
          observations.push({ level: 'info', text: 'The stutter matches what the customer described, so the pacing problem is the thing to explain.' });
          return { observations, next: 'result-stutter', summary: 'Stutter pattern confirmed by frame data.' };
        }
        if (gpu >= GPU_SATURATED) {
          observations.push({ level: 'info', text: `GPU utilization averages ${gpu}%, so the GPU is saturated during the capture.` });
          return { observations, next: 'result-gpu-bound', summary: 'GPU is the limit.' };
        }
        if (gpu < GPU_HEADROOM && cpu >= CPU_BUSY) {
          observations.push({ level: 'notice', text: `GPU utilization is only ${gpu}% while CPU averages ${cpu}%. The processor is the likely limit.` });
          return { observations, next: 'result-cpu-limited', summary: 'CPU appears to be the limit.' };
        }
        observations.push({ level: 'notice', text: `GPU (${gpu}%) and CPU (${cpu}%) both have headroom while the frame rate is low. The limit is probably power, heat, a driver, or the frame cap.` });
        return { observations, next: 'result-pacing', summary: 'Neither component is saturated.' };
      },
    },

    // ---- Results

    'result-gpu-bound': {
      type: 'result',
      id: 'result-gpu-bound',
      title: 'The GPU is the limit',
      why: 'When the GPU is saturated, frame rate rises only when the GPU has less work. Settings that cost the GPU the most are the right first place to look.',
      confidence: 'medium',
      summary:
        'GPU use stays near its ceiling while the frame rate is low. That is normal for a demanding scene. Lowering the most GPU-heavy settings or the render resolution will likely raise frame rate.',
      causes: ['Settings heavier than the GPU can sustain at this resolution', 'Scene-specific load, such as dense foliage, reflections, or particles'],
      uncertainty:
        'Confirm the change in the same scene. If a setting change does not move the frame rate, the limit is somewhere else.',
      actions: [
        {
          text: 'Change one graphics setting at a time in the same scene. Start with shadows, reflections, and render resolution scale. Record the frame rate after each change.',
          why: 'One change at a time shows which setting actually limits the GPU. Changing several at once makes the result impossible to attribute.',
          procedureId: 'gaming-frame-capture',
        },
        {
          text: 'Check GPU temperature and clock speed during the same scene with HWiNFO64.',
          why: 'A hot GPU lowers its own clock speed even at full utilization, which looks like a settings problem.',
        },
      ],
      verify: ['Repeat the same scene capture after each change, with the same setup record.'],
    },
    'result-cpu-limited': {
      type: 'result',
      id: 'result-cpu-limited',
      title: 'The processor is likely the limit',
      why: 'A processor limit often hides inside an overall average. The per-core picture is the evidence that makes this conclusion usable.',
      confidence: 'low',
      summary:
        'The GPU has headroom while the processor is busy. Game logic or a background process may be saturating one or more cores.',
      causes: ['One or more threads saturated by game logic or a simulation setting', 'Background software competing for the same cores'],
      uncertainty:
        'Average CPU use hides single-thread limits. Check per-core load in HWiNFO64 or CapFrameX’s counters before concluding.',
      actions: [
        {
          text: 'Check per-core load during the same scene. Identify any background process that uses a core during play.',
          why: 'A background process on the busiest core can cause the limit even when the total looks moderate.',
          procedureId: 'task-manager-baseline',
        },
        {
          text: 'Review CPU-related game settings, such as simulation distance or crowd density, before considering hardware changes.',
          why: 'These settings change the processor’s workload directly and can be reverted easily.',
        },
      ],
      verify: ['Repeat the capture after the change and compare the per-core picture, not only the average.'],
    },
    'result-stutter': {
      type: 'result',
      id: 'result-stutter',
      title: 'Frame pacing and stutter',
      why: 'Stutter is a timing problem. The average can look fine while a few long frames break the experience.',
      confidence: 'medium',
      summary:
        'Frame times spike while the average holds up. That pattern points to pacing: storage stalls while the game loads, background work starting mid-play, a frame cap that conflicts with the refresh rate, or thermal throttling.',
      causes: ['Storage stalls while the game streams textures or assets', 'Background work starting in the middle of play', 'A frame cap or variable refresh setting that conflicts with the monitor', 'Thermal throttling during the scene'],
      uncertainty:
        'Spikes can come from several sources at once. Match the spikes against disk activity and temperatures before deciding which one to change.',
      actions: [
        {
          text: 'Check whether the spikes line up with disk activity during the capture. Use Task Manager’s Disk column while the same scene runs.',
          why: 'Spikes that match disk activity point to storage, which is a different fix from a settings change.',
          procedureId: 'gaming-frame-capture',
        },
        {
          text: 'Check temperatures and clock speeds for throttling during the same capture.',
          why: 'Throttling produces spikes that look like stutter but come from heat.',
        },
        {
          text: 'Review the frame cap and variable refresh settings in the setup record. Match any cap to the refresh rate, with a small margin.',
          why: 'A cap that alternates with the refresh rate causes uneven frame delivery even on a fast system.',
        },
      ],
      verify: ['Repeat the capture and compare the 1% low and the frame-time graph with the earlier run.'],
    },
    'result-pacing': {
      type: 'result',
      id: 'result-pacing',
      title: 'Neither GPU nor CPU is the limit',
      why: 'When both components have headroom, the limit sits in a place the usage numbers do not show: power, heat, a driver, or a cap.',
      confidence: 'low',
      summary:
        'The GPU and CPU both have headroom while the frame rate is low. The cause is probably power, thermal, driver, or software-level. The measurements so far cannot tell which.',
      causes: ['A power plan or power limit that holds the processor or GPU back', 'Thermal throttling that lowers clock speed', 'A driver or game-specific fault', 'A frame cap set below the target frame rate'],
      uncertainty: 'Average utilization can look fine during throttling. The clock speed history is the evidence that matters here.',
      actions: [
        {
          text: 'Record GPU and CPU clock speeds and temperatures for the entire capture, not only the average.',
          why: 'Clocks that fall as temperatures rise are the signature of throttling.',
          procedureId: 'gaming-frame-capture',
        },
        {
          text: 'Confirm the Windows power plan and the GPU power limit in HWiNFO64 during the scene.',
          why: 'A power limit can cap performance while every usage number looks normal.',
        },
      ],
      verify: ['Repeat the capture after one change at a time, and keep the clock history in the notes.'],
    },
  },
};
