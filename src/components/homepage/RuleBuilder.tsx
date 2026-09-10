import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CollectionRule, ProductRuleField, RuleOperator } from '@/types/homepage';
import { RULE_FIELD_CONFIG } from '@/types/homepage';

interface RuleBuilderProps {
    rules: CollectionRule[];
    onChange: (rules: CollectionRule[]) => void;
}

export const RuleBuilder: React.FC<RuleBuilderProps> = ({ rules, onChange }) => {
    const handleAddRule = () => {
        const newRule: CollectionRule = {
            id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            field: 'selling_price',
            operator: 'lte',
            value: 1999,
        };
        onChange([...rules, newRule]);
    };

    const handleRemoveRule = (index: number) => {
        const next = [...rules];
        next.splice(index, 1);
        onChange(next);
    };

    const handleFieldChange = (index: number, newField: ProductRuleField) => {
        const fieldConfig = RULE_FIELD_CONFIG[newField];
        const next = [...rules];
        const defaultOp = fieldConfig.operators[0]?.value || 'eq';
        let defaultValue: string | number = '';

        if (fieldConfig.type === 'number') {
            defaultValue = newField === 'selling_price' ? 1999 : newField === 'stock' ? 0 : 10;
        } else if (newField === 'status') {
            defaultValue = 'active';
        }

        next[index] = {
            ...next[index],
            field: newField,
            operator: defaultOp,
            value: defaultValue,
        };
        onChange(next);
    };

    const handleOperatorChange = (index: number, newOp: RuleOperator) => {
        const next = [...rules];
        next[index] = {
            ...next[index],
            operator: newOp,
        };
        onChange(next);
    };

    const handleValueChange = (index: number, val: string | number) => {
        const next = [...rules];
        next[index] = {
            ...next[index],
            value: val,
        };
        onChange(next);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                    Rule Conditions
                </span>
                <span className="text-[11px] text-gray-500 font-sans">
                    All conditions must match (AND)
                </span>
            </div>

            {rules.length === 0 ? (
                <div className="p-4 border border-dashed border-gold/30 rounded-lg text-center bg-cream/20">
                    <p className="text-xs text-gray-500 mb-2">No conditions added yet. All in-stock products will match.</p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddRule}
                        className="text-xs border-gold/40 text-maroon hover:bg-gold/10"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add First Condition
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {rules.map((rule, idx) => {
                        const fieldConfig = RULE_FIELD_CONFIG[rule.field] || RULE_FIELD_CONFIG.selling_price;
                        return (
                            <React.Fragment key={rule.id || idx}>
                                {idx > 0 && (
                                    <div className="flex items-center gap-2 py-0.5">
                                        <div className="h-px bg-gold/20 flex-1" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-maroon/10 text-maroon border border-maroon/20">
                                            AND
                                        </span>
                                        <div className="h-px bg-gold/20 flex-1" />
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg border border-gold/25 bg-cream/10 hover:border-gold/40 transition-colors">
                                    {/* Field Selector */}
                                    <div className="sm:w-1/3">
                                        <select
                                            value={rule.field}
                                            onChange={(e) => handleFieldChange(idx, e.target.value as ProductRuleField)}
                                            aria-label="Filter Field"
                                            className="w-full text-xs bg-white border border-gold/30 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800 font-medium"
                                        >
                                            {Object.entries(RULE_FIELD_CONFIG).map(([key, config]) => (
                                                <option key={key} value={key}>
                                                    {config.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Operator Selector */}
                                    <div className="sm:w-1/3">
                                        <select
                                            value={rule.operator}
                                            onChange={(e) => handleOperatorChange(idx, e.target.value as RuleOperator)}
                                            aria-label="Filter Operator"
                                            className="w-full text-xs bg-white border border-gold/30 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                                        >
                                            {fieldConfig.operators.map((op) => (
                                                <option key={op.value} value={op.value}>
                                                    {op.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Value Input */}
                                    <div className="sm:w-1/3 flex items-center gap-2">
                                        {fieldConfig.type === 'select' ? (
                                            <select
                                                value={rule.value}
                                                onChange={(e) => handleValueChange(idx, e.target.value)}
                                                aria-label="Filter Value"
                                                className="w-full text-xs bg-white border border-gold/30 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                                            >
                                                {(fieldConfig.options || []).map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : fieldConfig.type === 'number' ? (
                                            <input
                                                type="number"
                                                value={rule.value}
                                                onChange={(e) => handleValueChange(idx, e.target.value === '' ? '' : Number(e.target.value))}
                                                placeholder="e.g. 1999"
                                                aria-label="Filter Numeric Value"
                                                className="w-full text-xs bg-white border border-gold/30 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={rule.value}
                                                onChange={(e) => handleValueChange(idx, e.target.value)}
                                                placeholder={`e.g. ${rule.field === 'occasion' ? 'Festive' : rule.field === 'fabric' ? 'Silk' : 'Red'}`}
                                                aria-label="Filter Text Value"
                                                className="w-full text-xs bg-white border border-gold/30 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                                            />
                                        )}

                                        {/* Remove Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRule(idx)}
                                            aria-label="Delete condition"
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                                            title="Delete condition"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}

                    <div className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddRule}
                            className="text-xs border-gold/40 text-maroon hover:bg-gold/10 font-medium"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Condition
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
