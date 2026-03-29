import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote, 
  Code, 
  Minus 
} from 'lucide-react';

const CommandsList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];

    if (item) {
      props.command(item);
    }
  };

  const onKeyDown = ({ event }: { event: KeyboardEvent }) => {
    if (event.key === 'ArrowUp') {
      setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
      return true;
    }

    if (event.key === 'ArrowDown') {
      setSelectedIndex((selectedIndex + 1) % props.items.length);
      return true;
    }

    if (event.key === 'Enter') {
      selectItem(selectedIndex);
      return true;
    }

    return false;
  };

  useImperativeHandle(ref, () => ({
    onKeyDown,
  }));

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const getIcon = (title: string) => {
    switch (title) {
      case 'Heading 1': return Heading1;
      case 'Heading 2': return Heading2;
      case 'Heading 3': return Heading3;
      case 'Bullet List': return List;
      case 'Numbered List': return ListOrdered;
      case 'Todo List': return CheckSquare;
      case 'Quote': return Quote;
      case 'Code Block': return Code;
      case 'Divider': return Minus;
      default: return Type;
    }
  };

  return (
    <div className="z-50 min-w-[320px] bg-white rounded-lg shadow-xl border border-[#37352f]/10 p-1 overflow-hidden animate-in fade-in zoom-in duration-100">
      {props.items.length ? (
        <div className="flex flex-col">
          {props.items.map((item: any, index: number) => {
            const Icon = getIcon(item.title);
            return (
              <button
                key={index}
                onClick={() => selectItem(index)}
                className={`flex items-center w-full text-left px-3 py-2 rounded-md transition-colors ${
                  index === selectedIndex ? 'bg-[#2383e2]/10 text-[#2383e2]' : 'hover:bg-foreground/5 text-[#37352f]'
                }`}
              >
                <div className={`mr-3 w-10 h-10 rounded-md border border-[#37352f]/10 flex items-center justify-center bg-white shadow-sm ${
                  index === selectedIndex ? 'border-[#2383e2]/30 text-[#2383e2]' : 'opacity-60'
                }`}>
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-[11px] opacity-40 leading-none mt-0.5">{item.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-2 text-sm opacity-40 italic">No results found</div>
      )}
    </div>
  );
});

CommandsList.displayName = 'CommandsList';

export default CommandsList;
