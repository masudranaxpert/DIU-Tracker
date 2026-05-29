import React, { useState, useEffect } from 'react';
import { Joyride, CallBackProps, STATUS, Step } from 'react-joyride';

interface TutorialHelperProps {
  run: boolean;
  onFinish: (skipped?: boolean) => void;
  activeTab: string;
  isLastPage?: boolean;
}

const TutorialHelper: React.FC<TutorialHelperProps> = ({ run, onFinish, activeTab, isLastPage }) => {
  const dashboardSteps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: (
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
            <span className="text-2xl">👋</span>
          </div>
          <h2 className="text-2xl font-black text-indigo-600 mb-2">Welcome, Scholar!</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Let's unlock the full potential of your DIU Class Tracker with a quick walkthrough.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.tour-sidebar',
      placement: 'right',
      content: 'Your Command Center: Navigate between your Dashboard, Courses, and more.',
    },
    {
      target: '.tour-switcher',
      placement: 'bottom',
      content: 'Multi-Batch Support: Quickly switch between your Batch and Section.',
    },
    {
      target: '.tour-stats',
      placement: 'left',
      content: 'Instant Insights: See your daily class count and total credit hours.',
    },
    {
      target: '.tour-schedule',
      placement: 'bottom',
      content: 'Today\'s Focus: Your Theory and Lab classes for today.',
    },
    {
      target: '.tour-nav-calendar',
      placement: 'right',
      content: (
        <div className="p-2">
          <p className="font-bold text-indigo-600 mb-2">Click here to continue! ➔</p>
          <p className="text-xs text-slate-500">The Dashboard is ready. Now, tap on the Calendar to see how to manage your schedule.</p>
        </div>
      ),
      disableBeacon: true,
      hideFooter: true,
    }
  ];

  const calendarSteps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: (
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📅</span>
          </div>
          <h2 className="text-2xl font-black text-indigo-600 mb-2">Calendar View</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Plan your month ahead. See all your classes and labs in a beautiful grid.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.tour-calendar-controls',
      placement: 'bottom',
      content: 'Time Travel: Navigate between months or jump back to Today.',
    },
    {
      target: '.tour-calendar-grid',
      placement: 'top',
      content: 'Visual Schedule: Colored dots show you exactly what\'s happening each day.',
    },
    {
      target: '.tour-nav-courses',
      placement: 'right',
      content: (
        <div className="p-2">
          <p className="font-bold text-indigo-600 mb-2">Next up: Courses! ➔</p>
          <p className="text-xs text-slate-500">Tap on the Course View icon to explore your curriculum materials.</p>
        </div>
      ),
      disableBeacon: true,
      hideFooter: true,
    }
  ];

  const coursesSteps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: (
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📚</span>
          </div>
          <h2 className="text-2xl font-black text-indigo-600 mb-2">Course Vault</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Deep dive into your courses. Everything from materials to records is here.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.tour-course-list',
      placement: 'right',
      content: 'Your Curriculum: Browse and search through all your registered courses.',
    },
    {
      target: '.tour-nav-groups',
      placement: 'right',
      content: (
        <div className="p-2">
          <p className="font-bold text-indigo-600 mb-2">Find your team! ➔</p>
          <p className="text-xs text-slate-500">Click on Groups to see your lab group members.</p>
        </div>
      ),
      disableBeacon: true,
      hideFooter: true,
    }
  ];

  const groupsSteps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: (
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👥</span>
          </div>
          <h2 className="text-2xl font-black text-indigo-600 mb-2">Groups</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Find your lab teammates and student IDs quickly.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.tour-groups-search',
      placement: 'bottom',
      content: 'Search: Type a name or ID to find someone instantly.',
    },
    {
      target: '.tour-nav-question_bank',
      placement: 'right',
      content: (
        <div className="p-2">
          <p className="font-bold text-indigo-600 mb-2">Exam Prep Time! ➔</p>
          <p className="text-xs text-slate-500">Tap on the Question Bank to access past papers.</p>
        </div>
      ),
      disableBeacon: true,
      hideFooter: true,
    }
  ];

  const qbSteps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: (
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❓</span>
          </div>
          <h2 className="text-2xl font-black text-indigo-600 mb-2">Question Bank</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Direct access to DIU QBank past exam questions.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.tour-qb-filters',
      placement: 'bottom',
      content: 'Filters: Find papers by Course or Exam Type (Mid/Final).',
    },
    {
      target: '.tour-nav-academic_year',
      placement: 'right',
      content: (
        <div className="p-2">
          <p className="font-bold text-indigo-600 mb-2">Plan your year! ➔</p>
          <p className="text-xs text-slate-500">Click on Academic Year to see the official calendar.</p>
        </div>
      ),
      disableBeacon: true,
      hideFooter: true,
    }
  ];

  const aySteps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: (
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏛️</span>
          </div>
          <h2 className="text-2xl font-black text-indigo-600 mb-2">Academic Year</h2>
          <p className="text-sm text-slate-600 leading-relaxed">The official DIU Academic Calendar for 2026.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.tour-ay-controls',
      placement: 'bottom',
      content: 'Utility: Share, download, or zoom the calendar PDF.',
    },
    {
      target: '.tour-nav-notices',
      placement: 'right',
      content: (
        <div className="p-2">
          <p className="font-bold text-indigo-600 mb-2">Stay Updated! ➔</p>
          <p className="text-xs text-slate-500">Finally, click on Announcements to see the notice feed.</p>
        </div>
      ),
      disableBeacon: true,
      hideFooter: true,
    }
  ];

  const noticesSteps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: (
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📢</span>
          </div>
          <h2 className="text-2xl font-black text-indigo-600 mb-2">Notice Board</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Official feed for class cancellations and changes.</p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.tour-notices-tabs',
      placement: 'bottom',
      content: 'Tabs: Switch between active and expired notices.',
    },
    {
        target: 'body',
        placement: 'center',
        content: (
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✨</span>
            </div>
            <h2 className="text-2xl font-black text-emerald-600 mb-2">All Set!</h2>
            <p className="text-sm text-slate-600 leading-relaxed">You've mastered the DIU Class Tracker. Go forth and conquer!</p>
          </div>
        ),
      }
  ];



  const [steps, setSteps] = useState<Step[]>(dashboardSteps);

  useEffect(() => {
    switch (activeTab) {
      case 'calendar': setSteps(calendarSteps); break;
      case 'courses': setSteps(coursesSteps); break;
      case 'groups': setSteps(groupsSteps); break;
      case 'question_bank': setSteps(qbSteps); break;
      case 'academic_year': setSteps(aySteps); break;
      case 'notices': setSteps(noticesSteps); break;
      default: setSteps(dashboardSteps); break;
    }

  }, [activeTab]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    // If the user finishes, skips, or manually closes the tutorial
    if (finishedStatuses.includes(status) || action === 'close') {
      onFinish(action === 'skip' || action === 'close');
    }
  };


  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton={false}

      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      disableOverlayClose
      spotlightClicks
      locale={{
        last: isLastPage ? 'Finish Tour' : 'Next ➔',
        skip: 'Skip All',
        close: 'Close'
      }}

      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#4f46e5', // Indigo-600
          textColor: '#334155', // Slate-700
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.75)',
        },
        tooltipContainer: {
          textAlign: 'left'
        },
        buttonNext: {
          backgroundColor: '#4f46e5',
          borderRadius: '12px',
          padding: '12px 24px',
          fontWeight: 'black',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        },
        buttonBack: {
          marginRight: 10,
          color: '#64748b',
          fontWeight: 'bold',
          fontSize: '12px',
          textTransform: 'uppercase'
        },
        buttonSkip: {
          color: '#ef4444', // red-500
          fontWeight: 'black',
          fontSize: '12px',
          textTransform: 'uppercase'
        }
      }}
    />
  );
};

export default TutorialHelper;
