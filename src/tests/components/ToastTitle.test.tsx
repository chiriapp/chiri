import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ToastTitle, type ToastType } from '$components/ToastTitle';

// react-dom test renders need act() to batch/flushing behavior; flag checked by React at runtime
const globalWithActEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  document.body.removeChild(container);
});

const render = async (ui: ReactElement) => {
  await act(async () => {
    root.render(ui);
  });
};

const getSpan = () => {
  const span = container.querySelector('span') as HTMLSpanElement;
  expect(span).not.toBeNull();
  return span;
};

const getSvg = () => {
  const svg = container.querySelector('svg') as SVGElement;
  expect(svg).not.toBeNull();
  return svg;
};

const TYPE_CASES: Array<{
  type: ToastType;
  colorClass: string;
  lucideClass: string;
}> = [
  { type: 'error', colorClass: 'text-semantic-error', lucideClass: 'lucide-circle-x' },
  { type: 'warning', colorClass: 'text-semantic-warning', lucideClass: 'lucide-triangle-alert' },
  { type: 'info', colorClass: 'text-primary-500', lucideClass: 'lucide-info' },
  { type: 'success', colorClass: 'text-primary-500', lucideClass: 'lucide-check' },
];

describe('ToastTitle', () => {
  it.each(
    TYPE_CASES,
  )('type="$type" renders the $lucideClass icon with $colorClass and sizing classes', async ({
    type,
    colorClass,
    lucideClass,
  }) => {
    await render(<ToastTitle type={type}>Something happened</ToastTitle>);

    const svg = getSvg();
    const svgClass = svg.getAttribute('class') ?? '';
    expect(svgClass).toContain('h-4 w-4 shrink-0');
    expect(svgClass).toContain(colorClass);
    expect(svg.classList.contains(lucideClass)).toBe(true);
  });

  it.each(TYPE_CASES)('type="$type" marks the icon svg aria-hidden', async ({ type }) => {
    await render(<ToastTitle type={type}>Something happened</ToastTitle>);

    expect(getSvg().getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the children text inside the wrapper span', async () => {
    await render(<ToastTitle type="error">Export failed</ToastTitle>);

    const span = getSpan();
    expect(span.textContent).toBe('Export failed');
  });

  it('lays out icon and text in an inline-flex row with a gap', async () => {
    await render(<ToastTitle type="info">Sync complete</ToastTitle>);

    expect(getSpan().getAttribute('class')).toBe('inline-flex items-center gap-2');
  });
});
