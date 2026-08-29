import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { t } from '../../lib/i18n.js';
import { isEditableTarget } from '../../lib/focus-target.js';
import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
const CarouselContext = React.createContext(null);
function useCarousel() {
    const context = React.useContext(CarouselContext);
    if (!context) {
        throw new Error('useCarousel must be used within a <Carousel />');
    }
    return context;
}
function Carousel({ orientation = 'horizontal', opts, setApi, plugins, label, className, children, ...props }) {
    const [carouselRef, api] = useEmblaCarousel({
        ...opts,
        axis: orientation === 'horizontal' ? 'x' : 'y',
    }, plugins);
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);
    const onSelect = React.useCallback((api) => {
        if (!api)
            return;
        setCanScrollPrev(api.canScrollPrev());
        setCanScrollNext(api.canScrollNext());
    }, []);
    const scrollPrev = React.useCallback(() => {
        api?.scrollPrev();
    }, [api]);
    const scrollNext = React.useCallback(() => {
        api?.scrollNext();
    }, [api]);
    const handleKeyDown = (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
            return;
        }
        // P1-4: do not hijack arrow keys when focus is inside an editable control
        // (text input, range slider, contenteditable, ...) — let it behave natively.
        if (isEditableTarget(event.target)) {
            return;
        }
        event.preventDefault();
        if (event.key === 'ArrowLeft') {
            scrollPrev();
        }
        else {
            scrollNext();
        }
    };
    React.useEffect(() => {
        if (!api || !setApi)
            return;
        setApi(api);
    }, [api, setApi]);
    React.useEffect(() => {
        if (!api)
            return;
        api.on('reInit', onSelect);
        api.on('select', onSelect);
        // Defer the initial sync via a microtask so the synchronous setState
        // pattern from `onSelect` does not happen inside the effect body.
        // Embla fires `reInit` shortly after mount, which is the canonical
        // subscription path for state initialization.
        queueMicrotask(() => onSelect(api));
        return () => {
            api?.off('reInit', onSelect);
            api?.off('select', onSelect);
        };
    }, [api, onSelect]);
    const contextValue = React.useMemo(() => ({
        carouselRef,
        api,
        opts,
        orientation: orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
    }), [carouselRef, api, opts, orientation, scrollPrev, scrollNext, canScrollPrev, canScrollNext]);
    return (_jsx(CarouselContext.Provider, { value: contextValue, children: _jsx("div", { onKeyDownCapture: handleKeyDown, className: cn('nop-carousel ', 'relative', className), role: "region", "aria-roledescription": "carousel", "aria-label": label ?? t('flux.carousel.label'), "data-slot": "carousel", ...props, children: children }) }));
}
function CarouselContent({ className, ...props }) {
    const { carouselRef, orientation } = useCarousel();
    return (_jsx("div", { ref: carouselRef, className: "overflow-hidden", "data-slot": "carousel-content", children: _jsx("div", { className: cn('nop-carousel ', 'flex', orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col', className), ...props }) }));
}
function CarouselItem({ className, ...props }) {
    const { orientation } = useCarousel();
    return (_jsx("div", { role: "group", "aria-roledescription": "slide", "data-slot": "carousel-item", className: cn('nop-carousel ', 'min-w-0 shrink-0 grow-0 basis-full', orientation === 'horizontal' ? 'pl-4' : 'pt-4', className), ...props }));
}
function CarouselPrevious({ className, variant = 'outline', size = 'icon-sm', ...props }) {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel();
    return (_jsxs(Button, { "data-slot": "carousel-previous", variant: variant, size: size, className: cn('nop-carousel ', 'absolute touch-manipulation rounded-full', orientation === 'horizontal'
            ? 'top-1/2 -left-12 -translate-y-1/2'
            : '-top-12 left-1/2 -translate-x-1/2 rotate-90', className), disabled: !canScrollPrev, onClick: scrollPrev, ...props, children: [_jsx(ChevronLeftIcon, {}), _jsx("span", { className: "sr-only", children: t('flux.carousel.previous') })] }));
}
function CarouselNext({ className, variant = 'outline', size = 'icon-sm', ...props }) {
    const { orientation, scrollNext, canScrollNext } = useCarousel();
    return (_jsxs(Button, { "data-slot": "carousel-next", variant: variant, size: size, className: cn('nop-carousel ', 'absolute touch-manipulation rounded-full', orientation === 'horizontal'
            ? 'top-1/2 -right-12 -translate-y-1/2'
            : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90', className), disabled: !canScrollNext, onClick: scrollNext, ...props, children: [_jsx(ChevronRightIcon, {}), _jsx("span", { className: "sr-only", children: t('flux.carousel.next') })] }));
}
export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, useCarousel, };
