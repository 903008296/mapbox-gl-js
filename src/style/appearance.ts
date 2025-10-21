import {createExpression} from "../style-spec/expression";
import latest from "../style-spec/reference/latest";
import {PossiblyEvaluated, type ConfigOptions, Layout, type PossiblyEvaluatedPropertyValue} from "./properties";
import {getAppearanceProperties, type AppearanceProps} from "./appearance_properties";

import type {Feature, FeatureState, GlobalProperties, StyleExpression} from "../style-spec/expression";
import type {AppearanceSpecification, ExpressionSpecification} from "../style-spec/types";
import type {StylePropertySpecification} from "../style-spec/style-spec";
import type ResolvedImage from "../style-spec/expression/types/resolved_image";
import type {CanonicalTileID} from "../source/tile_id";
import type EvaluationParameters from "./evaluation_parameters";
import type {ImageId} from "../style-spec/expression/types/image_id";
import type {ImageVariant} from "../style-spec/expression/types/image_variant";

export type ConditionCheckParams = {
    globals: GlobalProperties,
    feature?: Feature,
    featureState?: FeatureState,
    canonical?: CanonicalTileID,
    isHidden?: boolean
};

class SymbolAppearance {
    condition: StyleExpression;
    name?: string;
    properties?: PossiblyEvaluated<AppearanceProps>;
    unevaluatedLayout?: Layout<AppearanceProps>;
    cachedIconPrimary?: ImageVariant;

    constructor(condition: AppearanceSpecification["condition"], name: string | undefined, properties: AppearanceProps | undefined, scope: string, options: ConfigOptions, iconImageUseTheme: string) {
        this.cachedIconPrimary = null;

        const conditionSpec = (latest['appearance'] as Record<string, unknown>)['condition'] as StylePropertySpecification;

        const compiledExpression = createExpression(condition, conditionSpec);
        if (compiledExpression.result === 'success') {
            this.condition = compiledExpression.value;
        }
        this.name = name;

        if (properties) {
            this.properties = new PossiblyEvaluated(getAppearanceProperties());
            // For now, we only have layout properties so we can store them here but we'll need to change this when
            // supporting paint properties
            this.unevaluatedLayout = new Layout(getAppearanceProperties(), scope, options, iconImageUseTheme);
            for (const property in properties) {
                this.unevaluatedLayout.setValue(property as keyof AppearanceProps, properties[property]);
            }
        }
    }

    hasCachedIconPrimary() {
        return this.cachedIconPrimary !== null;
    }

    setCachedIconPrimary(iconPrimary: ImageVariant) {
        this.cachedIconPrimary = iconPrimary;
    }

    getCachedIconPrimary() {
        return this.cachedIconPrimary;
    }

    isActive(context: ConditionCheckParams): boolean {
        if (!this.condition && context.isHidden && this.name === 'hidden') return true;
        return this.condition.evaluate(context.globals, context.feature, context.featureState, context.canonical) as boolean;
    }

    getCondition(): StyleExpression {
        return this.condition;
    }

    getName(): string {
        return this.name;
    }

    getProperty(name: keyof AppearanceProps): PossiblyEvaluatedPropertyValue<ResolvedImage> | PossiblyEvaluatedPropertyValue<number> | PossiblyEvaluatedPropertyValue<[number, number]> {
        return this.properties.get(name);
    }

    getUnevaluatedProperties(): Layout<AppearanceProps> {
        return this.unevaluatedLayout;
    }

    recalculate(parameters: EvaluationParameters, availableImages: ImageId[], iconImageUseTheme?: string) {
        if (this.unevaluatedLayout) {

            (this as {properties: PossiblyEvaluated<AppearanceProps>}).properties = this.unevaluatedLayout.possiblyEvaluate(parameters, undefined, availableImages, iconImageUseTheme);
        }
    }

    serialize(): AppearanceSpecification {
        const result = {} as AppearanceSpecification;

        result['condition'] = this.condition.expression.serialize() as ExpressionSpecification;
        if (this.name) result['name'] = this.name;
        if (this.unevaluatedLayout) {
            result['properties'] = this.unevaluatedLayout.serialize();
        }

        return result;
    }
}

export default SymbolAppearance;
