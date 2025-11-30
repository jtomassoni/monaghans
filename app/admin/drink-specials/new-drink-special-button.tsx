'use client';

export default function NewDrinkSpecialButton() {
  return (
    <button
      onClick={() => {
        const event = new CustomEvent('openNewDrinkSpecial');
        window.dispatchEvent(event);
      }}
      className="px-4 py-2.5 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 border border-blue-400 dark:border-blue-500 touch-manipulation"
    >
      <span>➕</span>
      <span>New Drink Special</span>
    </button>
  );
}

