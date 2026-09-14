import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowUpRight, Anchor, Ship, Navigation } from "lucide-react";
export function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Anchor size={25} />
      </span>
      <span>
        ocean<span className="brand-light">stride</span>
        <small>MARITIME OPERATIONS</small>
      </span>
    </span>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close
            className="icon-button modal-close"
            aria-label="Close dialog"
          >
            <X size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      <i />
      {children}
    </span>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Ship size={28} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={16} />
    </button>
  );
}
export function OceanChart() {
  return (
    <div
      className="ocean-chart"
      aria-label="Illustrated maritime routes; not live vessel tracking"
    >
      <div className="chart-label">
        <Navigation size={13} /> A CONNECTED WORLD
      </div>
      <svg
        viewBox="0 0 700 270"
        role="img"
        aria-label="Decorative nautical route illustration"
      >
        <defs>
          <pattern
            id="grid"
            width="35"
            height="35"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 35 0 L 0 0 0 35"
              fill="none"
              stroke="#ffffff"
              strokeOpacity=".07"
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id="glow">
            <stop stopColor="#5bc8be" stopOpacity=".16" />
            <stop offset="1" stopColor="#5bc8be" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="700" height="270" fill="url(#grid)" />
        <ellipse cx="350" cy="130" rx="290" ry="155" fill="url(#glow)" />
        <g fill="#21484c" stroke="#3a6262" strokeWidth=".7">
          <path d="M65 61l39-21 51 4 24 18 44-4 20 23-17 16-36-2-18 25-34 13-4 28-21-6-13-35-20-12-22-2zM156 158l27-8 30 15 15 35-15 27-12 35-19-21-8-36zM304 50l24-19 50 5 12 24 30-11 19 15 37-2 43 20 42 7 45 33-23 19-37-8-8 24-34-10-24 11-19-27-23-4-12-21-35-5-17-24-25 8-21-12zM327 110l32-6 35 21 22 29-17 37-24 26-23-14-7-36-18-16zM520 194l26-15 32 10 22 30-21 17-39-8zM261 24l30-8 17 13-12 20-28 4z" />
        </g>
        <g
          fill="none"
          stroke="#73c5ba"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          className="chart-routes"
        >
          <path d="M130 119Q242 13 344 87T530 160" />
          <path d="M344 87Q254 154 359 170T530 160" />
          <path d="M130 119Q201 216 359 170" />
        </g>
        <g fill="#d9efbe" stroke="#142f35" strokeWidth="4">
          <circle cx="130" cy="119" r="6" />
          <circle cx="344" cy="87" r="6" />
          <circle cx="359" cy="170" r="6" />
          <circle cx="530" cy="160" r="6" />
        </g>
        <g fill="#bdcece" fontSize="10" fontFamily="monospace">
          <text x="102" y="143">
            NEW YORK
          </text>
          <text x="313" y="70">
            ROTTERDAM
          </text>
          <text x="338" y="193">
            LAGOS
          </text>
          <text x="503" y="184">
            SINGAPORE
          </text>
        </g>
      </svg>
      <div className="chart-footer">
        <span>
          <i /> ROUTE ILLUSTRATION
        </span>
        <span>OCEAN STRIDE / OPERATIONS AT A GLANCE</span>
      </div>
    </div>
  );
}
