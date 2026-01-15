import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const BentoBreadcrumbs = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    return (
        <nav className="flex items-center text-sm font-medium text-muted-foreground">
            <Link
                to="/"
                className="flex items-center hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-white/5"
            >
                <Home className="w-4 h-4" />
            </Link>

            {pathnames.map((value, index) => {
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;

                return (
                    <div key={to} className="flex items-center">
                        <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/40" />
                        {isLast ? (
                            <span className="text-foreground font-semibold px-2 py-1 bg-white/5 rounded-md capitalize">
                                {value.replace(/-/g, ' ')}
                            </span>
                        ) : (
                            <Link
                                to={to}
                                className="hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-white/5 capitalize"
                            >
                                {value.replace(/-/g, ' ')}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
};
