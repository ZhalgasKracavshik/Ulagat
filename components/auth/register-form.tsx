'use client'

import { signup } from '@/app/login/actions'
import { SubmitButton } from '@/components/auth/submit-button'
import { AuthShell } from '@/components/auth/AuthShell'
import Link from 'next/link'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useT } from '@/hooks/useT'
import { CLASS_LETTERS, REGISTRABLE_GRADES } from '@/lib/schedule/class-letter'

interface RegisterFormProps {
    initialInviteCode?: string
    /** Classes that exist in the timetable, so a student picks an exact match. */
    classOptions?: { grade: number; letter: string }[]
}

const INPUT =
    'block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30'
const LABEL = 'mb-1.5 block text-sm font-medium text-slate-700'

export function RegisterForm({ initialInviteCode, classOptions = [] }: RegisterFormProps) {
    const { t } = useT()
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [role, setRole] = useState<string>(initialInviteCode ? 'parent' : 'student')
    const [inviteCode, setInviteCode] = useState<string>((initialInviteCode || '').toUpperCase())
    const [showPassword, setShowPassword] = useState(false)
    const [studentClass, setStudentClass] = useState<string>('') // "grade|letter" or 'other'
    const [manualGrade, setManualGrade] = useState<string>('')
    const [manualLetter, setManualLetter] = useState<string>('')

    const isParent = role === 'parent'
    const isStudent = role === 'student'
    const hasClassOptions = classOptions.length > 0
    const useManualClass = !hasClassOptions || studentClass === 'other'

    // Final values submitted via hidden inputs (students only).
    let finalGrade = ''
    let finalLetter = ''
    if (isStudent) {
        if (useManualClass) {
            finalGrade = manualGrade
            finalLetter = manualLetter
        } else if (studentClass.includes('|')) {
            const [g, l] = studentClass.split('|')
            finalGrade = g
            finalLetter = l
        }
    }

    async function handleSubmit(formData: FormData) {
        setError(null)
        setMessage(null)
        if (isStudent && (!finalGrade || !finalLetter)) {
            setError(t('auth.classRequired'))
            return
        }
        const result = await signup(formData)
        if (result?.error) setError(result.error)
        else if (result?.message) setMessage(result.message)
    }

    return (
        <AuthShell>
            <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('auth.createAccount')}</h1>
                <p className="mt-2 text-sm text-slate-500">{t('auth.joinCommunity')}</p>
            </div>

            <form action={handleSubmit} className="mt-7 space-y-5">
                <div>
                    <label htmlFor="fullName" className={LABEL}>{t('auth.fullNameLatin')}</label>
                    <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        pattern="[a-zA-Z\s]+"
                        title={t('auth.fullNameTitle')}
                        autoComplete="name"
                        className={INPUT}
                        placeholder={t('auth.fullNamePlaceholder')}
                    />
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-tight text-slate-400">{t('auth.fullNameHint')}</p>
                </div>

                <div>
                    <label htmlFor="role" className={LABEL}>{t('auth.iAm')}</label>
                    <select
                        id="role"
                        name="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className={INPUT}
                    >
                        <option value="student">{t('auth.roleStudent')}</option>
                        <option value="parent">{t('auth.roleParent')}</option>
                    </select>
                </div>

                {isStudent && (
                    <div>
                        <label className={LABEL}>{t('auth.classLabel')}</label>
                        {hasClassOptions && (
                            <select
                                aria-label={t('auth.classLabel')}
                                className={INPUT}
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                            >
                                <option value="">{t('auth.classPlaceholder')}</option>
                                {classOptions.map((o) => (
                                    <option key={`${o.grade}|${o.letter}`} value={`${o.grade}|${o.letter}`}>
                                        {o.grade}{o.letter}
                                    </option>
                                ))}
                                <option value="other">{t('auth.classOther')}</option>
                            </select>
                        )}
                        {useManualClass && (
                            <div className={hasClassOptions ? 'mt-2 grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-3'}>
                                <select
                                    aria-label={t('auth.gradePlaceholder')}
                                    className={INPUT}
                                    value={manualGrade}
                                    onChange={(e) => setManualGrade(e.target.value)}
                                >
                                    <option value="">{t('auth.gradePlaceholder')}</option>
                                    {REGISTRABLE_GRADES.map((g) => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                                <select
                                    aria-label={t('auth.letterPlaceholder')}
                                    className={INPUT}
                                    value={manualLetter}
                                    onChange={(e) => setManualLetter(e.target.value)}
                                >
                                    <option value="">{t('auth.letterPlaceholder')}</option>
                                    {CLASS_LETTERS.map((l) => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <p className="mt-1 text-xs text-slate-500">{t('auth.classHint')}</p>
                        <input type="hidden" name="grade" value={finalGrade} />
                        <input type="hidden" name="class_letter" value={finalLetter} />
                    </div>
                )}

                {isParent && (
                    <div>
                        <label htmlFor="inviteCode" className={LABEL}>{t('auth.inviteCode')}</label>
                        <input
                            id="inviteCode"
                            name="inviteCode"
                            type="text"
                            required={isParent}
                            maxLength={8}
                            minLength={8}
                            pattern="[A-Za-z0-9]{8}"
                            title={t('auth.inviteCodeTitle')}
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            className={`${INPUT} text-center text-lg font-mono uppercase tracking-[0.3em]`}
                            placeholder="AB23CD45"
                        />
                        <p className="mt-1 text-xs text-slate-500">{t('auth.inviteCodeHint')}</p>
                    </div>
                )}

                <div>
                    <label htmlFor="email" className={LABEL}>{t('auth.emailAddress')}</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        required
                        className={INPUT}
                        placeholder="name@company.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className={LABEL}>{t('auth.password')}</label>
                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            minLength={6}
                            className={`${INPUT} pr-11`}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-xl text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                            aria-pressed={showPassword}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                        <span className="font-semibold">{t('auth.errorPrefix')}</span> {error}
                    </div>
                )}
                {message && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
                        {message}
                    </div>
                )}

                <SubmitButton>{t('auth.signUp')}</SubmitButton>
            </form>

            <div className="mt-6 text-center">
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                    {t('auth.haveAccount')}
                </Link>
            </div>
        </AuthShell>
    )
}
