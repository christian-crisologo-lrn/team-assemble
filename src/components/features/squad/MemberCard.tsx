import type { Member } from '../../../types';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { User, Edit2, Trash2 } from 'lucide-react';

interface MemberCardProps {
    member: Member;
    onEdit?: (member: Member) => void;
    onRemove?: (id: string) => void;
}

export function MemberCard({ member, onEdit, onRemove }: MemberCardProps) {
    return (
        <Card className="overflow-hidden hover:bg-accent/5 transition-colors group relative">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-secondary flex items-center justify-center border-2 border-transparent group-hover:border-primary transition-colors">
                        {member.avatar_url ? (
                            <img
                                src={member.avatar_url}
                                alt={member.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <User className="h-6 w-6 text-muted-foreground" />
                        )}
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg leading-tight">{member.name}</h4>
                        <p className="text-xs text-muted-foreground">Active Member</p>
                    </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <Button variant="ghost" size="icon" onClick={() => onEdit(member)}>
                            <Edit2 className="h-4 w-4" />
                        </Button>
                    )}
                    {onRemove && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onRemove(member.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
