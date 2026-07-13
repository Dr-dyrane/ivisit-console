import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export const LegacyQuickActionCard = ({ item, index, testId = false }) => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay: 0.4 + (index * 0.05), ease: [0.4, 0, 0.2, 1] }}
  >
    <Link
      to={item.path}
      className="block h-full group"
      data-testid={testId ? `quick-${item.id}` : undefined}
    >
      <div className="h-full min-h-[140px] bg-card/70 p-6 cursor-pointer relative overflow-hidden">
        <div className="" />
        <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        <div className="flex justify-between items-start">
          <div className={`w-12 h-12 bg-${item.color}/20 rounded-card flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
            <item.icon className={`h-6 w-6 text-${item.color}`} />
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ChevronRight className={`h-5 w-5 text-${item.color}`} />
          </div>
        </div>
        <div className="mt-4">
          <h4 className="font-semibold text-lg tracking-tight text-foreground">{item.label}</h4>
          <p className="text-base text-muted-foreground font-medium">{item.sub}</p>
        </div>
        <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className={`w-8 h-8 bg-${item.color}/20 rounded-pill flex items-center justify-center`}>
            <ChevronRight className={`h-4 w-4 text-${item.color}`} />
          </div>
        </div>
      </div>
    </Link>
  </motion.div>
);
