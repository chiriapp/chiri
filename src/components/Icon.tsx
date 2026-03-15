const Icon = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="App icon for Chiri. The icon contains a feather."
      className={className}
    >
      <path d="M68 32C32 40 23.6 64.68 15.28 85.36L22.84 88L26.64 78.8C28.56 79.48 30.56 80 32 80C76 80 88 12 88 12C84 20 56 21 36 25C16 29 8 46 8 54C8 62 15 69 15 69C28 32 68 32 68 32Z" />
    </svg>
  );
};

export default Icon;
