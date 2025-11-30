'use client';

export default function NewFoodSpecialButton() {
  return (
    <button
      onClick={() => {
        const event = new CustomEvent('openNewSpecial');
        window.dispatchEvent(event);
      }}
      className="px-4 py-2.5 bg-orange-500/90 dark:bg-orange-600/90 hover:bg-orange-600 dark:hover:bg-orange-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 border border-orange-400 dark:border-orange-500 touch-manipulation"
    >
      <span>➕</span>
      <span>New Food Special</span>
    </button>
  );
}

