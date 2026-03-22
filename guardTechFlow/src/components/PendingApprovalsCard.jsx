import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

export default function PendingApprovalsCard({ 
  icon: Icon = BarChart3,
  title = 'אישורים ממתינים',
  description = 'אישור או דחיית דוחות שהוגשו',
  buttonText = 'לאישורים',
  link = '/CommanderApprovals',
  accentColor = 'amber'
}) {
  const colorMap = {
    amber: { icon: 'text-amber-600', button: 'bg-amber-600 hover:bg-amber-700' },
    blue: { icon: 'text-blue-600', button: 'bg-blue-600 hover:bg-blue-700' },
    purple: { icon: 'text-purple-600', button: 'bg-purple-600 hover:bg-purple-700' },
  };

  const colors = colorMap[accentColor] || colorMap.amber;

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${colors.icon}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <p className="text-slate-600 flex-1">
          {description}
        </p>
        <Button asChild className={`w-full mt-4 ${colors.button}`}>
          <Link to={link}>
            {buttonText}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}