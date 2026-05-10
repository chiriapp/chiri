import type { LucideIcon } from 'lucide-react';
import Activity from 'lucide-react/icons/activity';
import Apple from 'lucide-react/icons/apple';
import Book from 'lucide-react/icons/book';
import Bookmark from 'lucide-react/icons/bookmark';
import Briefcase from 'lucide-react/icons/briefcase';
import Building2 from 'lucide-react/icons/building-2';
import Calendar from 'lucide-react/icons/calendar';
import Camera from 'lucide-react/icons/camera';
import Car from 'lucide-react/icons/car';
import CheckSquare from 'lucide-react/icons/check-square';
import Clock from 'lucide-react/icons/clock';
import Code from 'lucide-react/icons/code';
import Coffee from 'lucide-react/icons/coffee';
import CreditCard from 'lucide-react/icons/credit-card';
import Dog from 'lucide-react/icons/dog';
import Dumbbell from 'lucide-react/icons/dumbbell';
import Film from 'lucide-react/icons/film';
import Flag from 'lucide-react/icons/flag';
import Flame from 'lucide-react/icons/flame';
import Gift from 'lucide-react/icons/gift';
import GraduationCap from 'lucide-react/icons/graduation-cap';
import Hammer from 'lucide-react/icons/hammer';
import Headphones from 'lucide-react/icons/headphones';
import Heart from 'lucide-react/icons/heart';
import Home from 'lucide-react/icons/home';
import Laptop from 'lucide-react/icons/laptop';
import Leaf from 'lucide-react/icons/leaf';
import Lightbulb from 'lucide-react/icons/lightbulb';
import ListTodo from 'lucide-react/icons/list-todo';
import Mail from 'lucide-react/icons/mail';
import MapPin from 'lucide-react/icons/map-pin';
import MessageCircle from 'lucide-react/icons/message-circle';
import Moon from 'lucide-react/icons/moon';
import Mountain from 'lucide-react/icons/mountain';
import Music from 'lucide-react/icons/music';
import Paintbrush from 'lucide-react/icons/paintbrush';
import Palette from 'lucide-react/icons/palette';
import Phone from 'lucide-react/icons/phone';
import Pill from 'lucide-react/icons/pill';
import Plane from 'lucide-react/icons/plane';
import Receipt from 'lucide-react/icons/receipt';
import ShoppingCart from 'lucide-react/icons/shopping-cart';
import Sofa from 'lucide-react/icons/sofa';
import Sparkles from 'lucide-react/icons/sparkles';
import Star from 'lucide-react/icons/star';
import Sun from 'lucide-react/icons/sun';
import Tag from 'lucide-react/icons/tag';
import Target from 'lucide-react/icons/target';
import TreePine from 'lucide-react/icons/tree-pine';
import TrendingUp from 'lucide-react/icons/trending-up';
import Trophy from 'lucide-react/icons/trophy';
import User from 'lucide-react/icons/user';
import Users from 'lucide-react/icons/users';
import Wallet from 'lucide-react/icons/wallet';
import Wrench from 'lucide-react/icons/wrench';
import Zap from 'lucide-react/icons/zap';

/**
 * Available icons for calendars and tags
 */
export const CALENDAR_ICONS: { name: string; icon: LucideIcon }[] = [
  // Organization
  { name: 'calendar', icon: Calendar },
  { name: 'check-square', icon: CheckSquare },
  { name: 'list-todo', icon: ListTodo },
  { name: 'clock', icon: Clock },
  { name: 'bookmark', icon: Bookmark },
  { name: 'tag', icon: Tag },
  { name: 'flag', icon: Flag },
  // Work & Productivity
  { name: 'briefcase', icon: Briefcase },
  { name: 'target', icon: Target },
  { name: 'zap', icon: Zap },
  { name: 'building', icon: Building2 },
  { name: 'laptop', icon: Laptop },
  { name: 'code', icon: Code },
  // Goals & Motivation
  { name: 'star', icon: Star },
  { name: 'trophy', icon: Trophy },
  { name: 'flame', icon: Flame },
  { name: 'sparkles', icon: Sparkles },
  { name: 'lightbulb', icon: Lightbulb },
  // Personal & Home
  { name: 'home', icon: Home },
  { name: 'heart', icon: Heart },
  { name: 'coffee', icon: Coffee },
  { name: 'sun', icon: Sun },
  { name: 'moon', icon: Moon },
  { name: 'sofa', icon: Sofa },
  { name: 'wrench', icon: Wrench },
  { name: 'hammer', icon: Hammer },
  // Health & Wellness
  { name: 'dumbbell', icon: Dumbbell },
  { name: 'activity', icon: Activity },
  { name: 'apple', icon: Apple },
  { name: 'pill', icon: Pill },
  // Finance
  { name: 'wallet', icon: Wallet },
  { name: 'shopping-cart', icon: ShoppingCart },
  { name: 'credit-card', icon: CreditCard },
  { name: 'trending-up', icon: TrendingUp },
  { name: 'receipt', icon: Receipt },
  // Education & Learning
  { name: 'book', icon: Book },
  { name: 'graduation-cap', icon: GraduationCap },
  // Social & Communication
  { name: 'user', icon: User },
  { name: 'users', icon: Users },
  { name: 'gift', icon: Gift },
  { name: 'message-circle', icon: MessageCircle },
  { name: 'mail', icon: Mail },
  { name: 'phone', icon: Phone },
  // Travel & Outdoors
  { name: 'plane', icon: Plane },
  { name: 'car', icon: Car },
  { name: 'map-pin', icon: MapPin },
  { name: 'mountain', icon: Mountain },
  { name: 'tree-pine', icon: TreePine },
  { name: 'leaf', icon: Leaf },
  { name: 'dog', icon: Dog },
  // Creative & Entertainment
  { name: 'music', icon: Music },
  { name: 'camera', icon: Camera },
  { name: 'paintbrush', icon: Paintbrush },
  { name: 'palette', icon: Palette },
  { name: 'headphones', icon: Headphones },
  { name: 'film', icon: Film },
];

/**
 * Get icon component by name, fallback to Calendar icon
 * @param name - Icon name
 * @returns Icon component
 */
export const getIconByName = (name: string): LucideIcon => {
  const found = CALENDAR_ICONS.find((i) => i.name === name);
  return found?.icon ?? Calendar;
};
