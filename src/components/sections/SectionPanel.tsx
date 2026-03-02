import { useState } from 'react'
import { useDAWStore } from '../../store/useDAWStore'
import type { Section } from '../../types'

export function SectionPanel() {
  const { state, dispatch } = useDAWStore()
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [nameValue, setNameValue] = useState('')

  const playingSectionIdx = state.transport.currentSectionIdx

  const startEditName = (section: Section) => {
    setEditingNameId(section.id)
    setNameValue(section.name)
  }

  const commitName = (id: string) => {
    dispatch({ type: 'SET_SECTION_NAME', id, name: nameValue.trim() || 'Section' })
    setEditingNameId(null)
  }

  return (
    <div className="section-panel">
      <span className="section-panel-label">SECTIONS</span>
      <div className="section-chips">
        {state.sections.map((section, idx) => {
          const isEditing = state.currentSectionId === section.id
          const isPlaying = state.transport.isPlaying && playingSectionIdx === idx
          return (
            <div
              key={section.id}
              className={[
                'section-chip',
                isEditing ? 'section-chip--editing' : '',
                isPlaying ? 'section-chip--playing' : '',
              ].join(' ')}
              onClick={() => dispatch({ type: 'SELECT_SECTION', id: section.id })}
            >
              {/* Name (double-click to rename) */}
              {editingNameId === section.id ? (
                <input
                  className="section-name-input"
                  value={nameValue}
                  autoFocus
                  onChange={e => setNameValue(e.target.value)}
                  onBlur={() => commitName(section.id)}
                  onKeyDown={e => { if (e.key === 'Enter') commitName(section.id) }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span
                  className="section-chip-name"
                  onDoubleClick={e => { e.stopPropagation(); startEditName(section) }}
                >
                  {section.name}
                </span>
              )}

              {/* Bars dropdown */}
              <select
                className="section-bars-select"
                value={section.bars}
                onClick={e => e.stopPropagation()}
                onChange={e => dispatch({
                  type: 'SET_SECTION_BARS',
                  id: section.id,
                  bars: Number(e.target.value) as 1 | 2 | 4 | 8,
                })}
              >
                <option value={1}>1B</option>
                <option value={2}>2B</option>
                <option value={4}>4B</option>
                <option value={8}>8B</option>
              </select>

              {/* Loop count */}
              <span className="section-chip-x">×</span>
              <input
                type="number"
                className="section-loop-input"
                value={section.loopCount}
                min={1}
                max={16}
                onClick={e => e.stopPropagation()}
                onChange={e => dispatch({
                  type: 'SET_SECTION_LOOP_COUNT',
                  id: section.id,
                  loopCount: Number(e.target.value),
                })}
              />

              {/* Delete button */}
              {state.sections.length > 1 && (
                <button
                  className="section-delete-btn"
                  title="Delete section"
                  onClick={e => {
                    e.stopPropagation()
                    dispatch({ type: 'REMOVE_SECTION', id: section.id })
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}

        <button
          className="section-add-btn"
          onClick={() => dispatch({ type: 'ADD_SECTION' })}
        >
          + Add Section
        </button>
      </div>
    </div>
  )
}
