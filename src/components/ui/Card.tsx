
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    shouldGlass?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', children, shouldGlass = false, ...props }, ref) => {
        const baseClass = 'card';
        const glassClass = shouldGlass ? 'card-glass' : '';

        return (
            <div
                ref={ref}
                className={`${baseClass} ${glassClass} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';
