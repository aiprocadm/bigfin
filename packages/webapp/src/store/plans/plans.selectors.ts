import { createSelector } from 'reselect';

const plansSelector = (state: any) => state.plans.plans;
const planSelector = (state: any, props: any) =>
  state.plans.plans.find((plan: any) => plan.slug === props.planSlug);

const plansPeriodSelector = (state: any) => state.plans.plansPeriod;

// Retrieve manual jounral current page results.
export const getPlansSelector = () =>
  createSelector(plansSelector, (plans) => {
    return plans;
  });

// Retrieve plan details.
export const getPlanSelector = () =>
  createSelector(planSelector, (plan) => plan);

// Retrieves the plans period (monthly or annually).
export const getPlansPeriodSelector = () =>
  createSelector(plansPeriodSelector, (periods) => periods);
