import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  ClockIcon,
  UserPlusIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { formatDateTime } from '../../../lib/format'
import type { AttendanceStageTone, CareEvent } from '../attendance-status'

const stageIcons: Record<AttendanceStageTone, ReactNode> = {
  registered: <UserPlusIcon size={20} weight="duotone" aria-hidden="true" />,
  pending: <ClockIcon size={20} weight="duotone" aria-hidden="true" />,
  triaged: <ClipboardTextIcon size={20} weight="duotone" aria-hidden="true" />,
  completed: <CheckCircleIcon size={20} weight="duotone" aria-hidden="true" />,
  canceled: <XCircleIcon size={20} weight="duotone" aria-hidden="true" />,
}

export function AttendanceStatusSummary({ event }: { event: CareEvent }) {
  return (
    <section
      className={`attendance-stage attendance-stage--${event.tone}`}
      aria-label={`${event.eyebrow}: ${event.title}`}
    >
      <span className="attendance-stage__icon">{stageIcons[event.tone]}</span>
      <div className="attendance-stage__body">
        <div className="attendance-stage__heading">
          <div>
            <span>{event.eyebrow}</span>
            <h3>{event.title}</h3>
          </div>
          <time
            dateTime={event.at}
            aria-label={`${event.eyebrow} em ${formatDateTime(event.at)}`}
          >
            <CalendarBlankIcon size={14} aria-hidden="true" />
            {formatDateTime(event.at)}
          </time>
        </div>
        <p>{event.description}</p>

        {event.metadata.length > 0 ? (
          <dl className="attendance-stage__metadata">
            {event.metadata.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  )
}
