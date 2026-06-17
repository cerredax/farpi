'use client'

import { useState } from 'react'
import {
  addDays,
  addMonths,
  endOfWeek,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { useStore } from '@/lib/store-context'
import { CalendarHeader } from './CalendarHeader'
import { MonthGrid } from './MonthGrid'
import { AgendaList } from './AgendaList'
import { EventSheet } from './EventSheet'
import { Card } from '@/components/ui/Card'
import type { Event, EventDraft } from '@/types'

type CalendarViewMode = 'week' | 'month' | 'agenda'

const VIEW_OPTIONS: Array<{ mode: CalendarViewMode; label: string; hint: string }> = [
  { mode: 'week', label: 'Semana', hint: '7 días' },
  { mode: 'month', label: 'Mes', hint: 'visual' },
  { mode: 'agenda', label: 'Agenda', hint: 'lista' },
]

export function CalendarView() {
  const { kids, allEvents, createEvent, updateEvent, deleteEvent } = useStore()

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today))
  const [selectedDay, setSelectedDay]   = useState(today)
  const [viewMode, setViewMode]         = useState<CalendarViewMode>('week')
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  function openCreate(day = selectedDay) {
    setSelectedDay(day)
    setEditingEvent(null)
    setSheetOpen(true)
  }

  function openEdit(event: Event) { setEditingEvent(event); setSheetOpen(true) }

  function selectDay(day: Date) {
    setSelectedDay(day)
    if (!isSameMonth(day, currentMonth)) setCurrentMonth(startOfMonth(day))
  }

  function handleCreate(draft: EventDraft) {
    const event = createEvent(draft)
    const eventDate = parseISO(event.start_at)
    setSelectedDay(eventDate)
    setCurrentMonth(startOfMonth(eventDate))
  }

  const weekRange = {
    start: startOfWeek(selectedDay, { weekStartsOn: 1 }),
    end: endOfWeek(selectedDay, { weekStartsOn: 1 }),
  }

  const agendaEvents = allEvents.filter(event => {
    const eventDate = parseISO(event.start_at)
    if (viewMode === 'month') return isSameMonth(eventDate, currentMonth)
    if (viewMode === 'agenda') {
      return isWithinInterval(eventDate, {
        start: startOfDay(selectedDay),
        end: addDays(startOfDay(selectedDay), 45),
      })
    }
    return isWithinInterval(eventDate, weekRange)
  })

  const sheetKey = editingEvent
    ? `edit-${editingEvent.id}`
    : `create-${format(selectedDay, 'yyyyMMdd')}`

  return (
    <>
      <div className="max-w-lg mx-auto flex flex-col pb-6">
        <div className="mx-4 mt-3">
          <Card padded={false}>
            <CalendarHeader
              currentMonth={currentMonth}
              onPrev={() => setCurrentMonth(m => subMonths(m, 1))}
              onNext={() => setCurrentMonth(m => addMonths(m, 1))}
            />
            <div className="pb-3">
              <MonthGrid
                currentMonth={currentMonth}
                selectedDay={selectedDay}
                events={allEvents}
                kids={kids}
                density={viewMode === 'month' ? 'detailed' : 'compact'}
                onSelectDay={selectDay}
                onEditEvent={openEdit}
                onAddEvent={openCreate}
              />
            </div>
          </Card>
        </div>

        <div className="mx-4 mt-4 grid grid-cols-3 gap-1 rounded-[22px] bg-[#F2EEE8] p-1.5 border border-[#EDE9E3] shadow-sm">
          {VIEW_OPTIONS.map(option => {
            const isActive = viewMode === option.mode
            return (
              <button
                key={option.mode}
                onClick={() => setViewMode(option.mode)}
                className={`rounded-2xl px-2 py-2 text-center transition-all ${
                  isActive
                    ? 'bg-white text-[#252525] shadow-sm ring-1 ring-[#8BA888]/20'
                    : 'text-[#77716A] hover:bg-white/50'
                  }`}
              >
                <span className="block text-[13px] font-black leading-tight">{option.label}</span>
                <span className={`block text-[10px] font-bold leading-tight ${isActive ? 'text-[#8BA888]' : 'text-[#A39B93]'}`}>
                  {option.hint}
                </span>
              </button>
            )
          })}
        </div>

        <div className="pt-2">
          <AgendaList
            mode={viewMode}
            selectedDay={selectedDay}
            currentMonth={currentMonth}
            events={agendaEvents}
            kids={kids}
            onSelectDay={selectDay}
            onEdit={openEdit}
            onAdd={openCreate}
          />
        </div>
      </div>

      <EventSheet
        key={sheetKey}
        open={sheetOpen}
        mode={editingEvent ? 'edit' : 'create'}
        initial={editingEvent}
        defaultDate={selectedDay}
        kids={kids}
        onClose={() => setSheetOpen(false)}
        onCreate={handleCreate}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
      />
    </>
  )
}
