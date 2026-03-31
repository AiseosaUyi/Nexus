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
  Heading4,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Info,
  Image,
  Video,
  Volume2,
  File,
  FileText,
  UserRound,
  ChevronRight,
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

  useImperativeHandle(ref, () => ({ onKeyDown }));

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const getIcon = (title: string) => {
    switch (title) {
      case 'Text':            return Type;
      case 'Heading 1':       return Heading1;
      case 'Heading 2':       return Heading2;
      case 'Heading 3':       return Heading3;
      case 'Heading 4':       return Heading4;
      case 'Bulleted list':   return List;
      case 'Numbered list':   return ListOrdered;
      case 'To-do list':      return CheckSquare;
      case 'Toggle list':     return ChevronRight;
      case 'Page':            return FileText;
      case 'Callout':         return Info;
      case 'Quote':           return Quote;
      case 'Image':           return Image;
      case 'Video':           return Video;
      case 'Audio':           return Volume2;
      case 'Code':            return Code;
      case 'File':            return File;
      case 'Mention a person': return UserRound;
      default:                return Type;
    }
  };

  return (
    <div className="z-50 w-[280px] bg-background rounded-xl shadow-popover border border-border p-1.5 overflow-y-auto max-h-[420px] animate-in fade-in zoom-in-95 duration-100 custom-scrollbar">
      {props.items.length ? (
        <div className="flex flex-col">
          {props.items.map((item: any, index: number) => {
            const Icon = getIcon(item.title);
            const showGroup = index === 0 || item.group !== props.items[index - 1].group;

            return (
              <React.Fragment key={index}>
                {showGroup && item.group && (
                  <div className={`px-2 pt-3 pb-1 text-[11px] font-semibold text-foreground/40 uppercase tracking-widest ${index === 0 ? 'pt-1' : ''}`}>
                    {item.group}
                  </div>
                )}
                <button
                  onClick={() => selectItem(index)}
                  className={`flex items-center w-full text-left px-2 py-1.5 rounded-md transition-colors gap-3 ${
                    index === selectedIndex
                      ? 'bg-accent/10 text-foreground'
                      : 'hover:bg-hover text-foreground/80'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    index === selectedIndex
                      ? 'border-accent/30 bg-accent/10 text-accent'
                      : 'border-border bg-sidebar text-foreground/50'
                  }`}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </div>
                  <span className="text-[13px] font-medium flex-1 truncate">{item.title}</span>
                  {item.shortcut && (
                    <span className="text-[11px] text-foreground/30 font-mono shrink-0">{item.shortcut}</span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-2 text-sm text-foreground/40 italic">No results</div>
      )}
    </div>
  );
});

CommandsList.displayName = 'CommandsList';

export default CommandsList;
