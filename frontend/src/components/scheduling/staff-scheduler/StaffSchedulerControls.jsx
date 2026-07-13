import React from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

export const StaffSchedulerControls = ({ controller }) => (
  <Card className="p-4">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Select value={controller.viewMode} onValueChange={controller.setViewMode}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => controller.navigateDate(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium min-w-[200px] text-center">
          {controller.currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
            ...(controller.viewMode === 'week' && { day: 'numeric' }),
          })}
        </span>
        <Button variant="outline" size="sm" onClick={() => controller.navigateDate(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-[300px]">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search staff..."
          value={controller.searchTerm}
          onChange={(event) => controller.setSearchTerm(event.target.value)}
          className="flex-1"
        />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select
          value={controller.filterDepartment}
          onValueChange={controller.setFilterDepartment}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="Emergency">Emergency</SelectItem>
            <SelectItem value="ICU">ICU</SelectItem>
            <SelectItem value="Ambulance">Ambulance</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </Card>
);
