import { DynamicIcon } from './IconPicker';
import type { Member, Role } from '../../types';

interface PresentationPreviewProps {
    teamName: string;
    roles: Role[];
    members: Member[];
    assignments: Record<string, string>;
}

/**
 * A static preview card showing the team composition.
 * This component is designed to be screenshot-friendly for OG images.
 */
export function PresentationPreview({ teamName, roles, members, assignments }: PresentationPreviewProps) {
    return (
        <div className="w-[1200px] h-[630px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-12 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-60 h-60 bg-pink-500 rounded-full blur-3xl"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-6xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-extrabold text-white mb-2">
                        Team {teamName}
                    </h1>
                    <p className="text-purple-300 text-2xl">Sprint Roles</p>
                </div>

                {/* Roles Grid */}
                <div className="grid grid-cols-4 gap-6">
                    {roles.slice(0, 8).map((role) => {
                        const memberId = assignments[role.id];
                        const member = members.find((m) => m.id === memberId);

                        return (
                            <div
                                key={role.id}
                                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 flex flex-col items-center gap-3"
                            >
                                {/* Role Icon */}
                                <div className="bg-purple-500/20 p-3 rounded-full">
                                    <DynamicIcon
                                        name={role.icon || 'Shield'}
                                        className="h-8 w-8 text-purple-300"
                                    />
                                </div>

                                {/* Role Name */}
                                <div className="text-purple-200 text-sm font-bold uppercase tracking-wide text-center">
                                    {role.name}
                                </div>

                                {/* Member Avatar & Name */}
                                {member ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-700 border-2 border-purple-400">
                                            {member.avatar_url ? (
                                                <img
                                                    src={member.avatar_url}
                                                    alt={member.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-white text-sm font-semibold text-center truncate w-full">
                                            {member.name}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-slate-400 text-sm italic">Unassigned</div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <div className="text-purple-300 text-lg">team-assemble</div>
                </div>
            </div>
        </div>
    );
}
