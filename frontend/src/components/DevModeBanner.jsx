import { useMockUser } from './MockUserContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function DevModeBanner() {
  const { activeMockUser, switchMockUser } = useMockUser();
  const navigate = useNavigate();

  const handleSwitch = (userType) => {
    switchMockUser(userType);
    navigate('/Home');
  };

  return (
    <div className="bg-amber-100 border-b border-amber-300 p-2 md:p-3 mb-3 md:mb-0">
      <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-1 md:gap-2">
        <div className="flex items-center gap-1 md:gap-3 flex-wrap w-full md:w-auto">
          <span className="text-xs md:text-sm font-semibold text-amber-900">🧪 Dev:</span>
          {activeMockUser && (
            <>
              <Badge className="bg-amber-600 text-xs h-5">{activeMockUser.name}</Badge>
              <Badge variant="outline" className="text-xs h-5">{activeMockUser.role.toUpperCase()}</Badge>
              <span className="text-amber-700 text-xs md:hidden">↓</span>
              <span className="text-amber-700 text-xs hidden md:inline">| עבור ל:</span>
            </>
          )}
          <div className="flex gap-1 md:gap-2">
            <Button
              size="sm"
              onClick={() => handleSwitch('USER')}
              className="h-6 px-2 text-xs bg-white hover:bg-amber-50 border border-amber-400 text-amber-900"
              variant="outline"
            >
              משתמש
            </Button>
            <Button
              size="sm"
              onClick={() => handleSwitch('COMMANDER')}
              className="h-6 px-2 text-xs bg-white hover:bg-amber-50 border border-amber-400 text-amber-900"
              variant="outline"
            >
              מפקד
            </Button>
            <Button
              size="sm"
              onClick={() => handleSwitch('ADMIN')}
              className="h-6 px-2 text-xs bg-white hover:bg-amber-50 border border-amber-400 text-amber-900"
              variant="outline"
            >
              מנהל
            </Button>
          </div>
        </div>
        {activeMockUser && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { switchMockUser(null); navigate('/Home'); }}
            className="text-amber-900 hover:bg-amber-200 h-6 px-2 text-xs ml-auto"
          >
            ✕ סגור
          </Button>
        )}
      </div>
    </div>
  );
}