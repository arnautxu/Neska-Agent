import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { TooltipAnchor } from '@librechat/client';
import { getConfigDefaults } from 'librechat-data-provider';
import type { ModelSelectorProps } from '~/common';
import {
  renderModelSpecs,
  renderEndpoints,
  renderSearchResults,
  renderCustomGroups,
} from './components';
import { ModelSelectorProvider, useModelSelectorContext } from './ModelSelectorContext';
import { useShortcutAriaKey, useShortcutHint } from '~/hooks/useKeyboardShortcuts';
import { ModelSelectorChatProvider } from './ModelSelectorChatContext';
import { getSelectedIcon, getDisplayValue } from './utils';
import { CustomMenu as Menu } from './CustomMenu';
import DialogManager from './DialogManager';
import { useLocalize } from '~/hooks';

const defaultInterface = getConfigDefaults().interface;

function ModelSelectorContent({ variant = 'header' }: { variant?: 'header' | 'composer' }) {
  const inComposer = variant === 'composer';
  const localize = useLocalize();
  const modelSelectorHint = useShortcutHint('openModelSelector', localize('com_ui_select_model'));
  const modelSelectorAriaKey = useShortcutAriaKey('openModelSelector');

  const {
    // LibreChat
    agentsMap,
    modelSpecs,
    mappedEndpoints,
    endpointsConfig,
    // State
    searchValue,
    searchResults,
    selectedValues,
    // Functions
    setSearchValue,
    setSelectedValues,
    // Dialog
    keyDialogOpen,
    onOpenChange,
    keyDialogEndpoint,
  } = useModelSelectorContext();

  const selectedIcon = useMemo(
    () =>
      getSelectedIcon({
        mappedEndpoints: mappedEndpoints ?? [],
        selectedValues,
        modelSpecs,
        endpointsConfig,
        agentsMap,
      }),
    [mappedEndpoints, selectedValues, modelSpecs, endpointsConfig, agentsMap],
  );
  const selectedDisplayValue = useMemo(
    () =>
      getDisplayValue({
        localize,
        agentsMap,
        modelSpecs,
        selectedValues,
        mappedEndpoints,
      }),
    [localize, agentsMap, modelSpecs, selectedValues, mappedEndpoints],
  );

  /** Neska: in the input box the picker is a quiet text button, named by the mode
   *  ("Ràpid", "Intel·ligent") with a chevron; it never shows a provider or model. */
  const composerTrigger = (
    <button
      type="button"
      data-testid="model-selector-button"
      aria-keyshortcuts={modelSelectorAriaKey}
      aria-label={localize('com_ui_select_model')}
      className="text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-theme-control flex h-8 shrink-0 items-center gap-1 px-2 text-sm"
    >
      <span className="truncate">{selectedDisplayValue}</span>
      <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
    </button>
  );

  const trigger = (
    <TooltipAnchor
      aria-label={localize('com_ui_select_model')}
      description={modelSelectorHint}
      render={
        <button
          data-testid="model-selector-button"
          aria-keyshortcuts={modelSelectorAriaKey}
          className="border-border-chrome bg-presentation text-text-primary hover:bg-surface-active-alt rounded-theme-control my-1 flex h-9 max-w-full items-center gap-2 border px-3 py-2 text-sm"
          aria-label={localize('com_ui_select_model')}
        >
          {selectedIcon && React.isValidElement(selectedIcon) && (
            <div className="flex shrink-0 items-center justify-center overflow-hidden">
              {selectedIcon}
            </div>
          )}
          <span className="truncate text-start">{selectedDisplayValue}</span>
        </button>
      }
    />
  );

  return (
    <div
      className={
        inComposer
          ? 'relative flex min-w-0 items-center'
          : 'relative flex max-w-[60vw] min-w-0 flex-col items-center gap-2 sm:max-w-xs'
      }
    >
      <Menu
        placement={inComposer ? 'top-end' : undefined}
        /* The root menu button paints a bordered 40px field; in the input box the
           mode is a quiet text button like its neighbours. */
        className={inComposer ? 'h-8 w-auto border-0 bg-transparent px-2' : undefined}
        values={selectedValues}
        onValuesChange={(values: Record<string, any>) => {
          setSelectedValues({
            endpoint: values.endpoint || '',
            model: values.model || '',
            modelSpec: values.modelSpec || '',
          });
        }}
        onSearch={inComposer ? undefined : (value) => setSearchValue(value)}
        combobox={inComposer ? undefined : <input id="model-search" placeholder=" " />}
        comboboxLabel={inComposer ? undefined : localize('com_endpoint_search_models')}
        trigger={inComposer ? composerTrigger : trigger}
      >
        {searchResults ? (
          renderSearchResults(searchResults, localize, searchValue)
        ) : (
          <>
            {/* Render ungrouped modelSpecs (no group field) */}
            {renderModelSpecs(
              modelSpecs?.filter((spec) => !spec.group) || [],
              selectedValues.modelSpec || '',
            )}
            {/* Render endpoints (will include grouped specs matching endpoint names) */}
            {renderEndpoints(mappedEndpoints ?? [])}
            {/* Render custom groups (specs with group field not matching any endpoint) */}
            {renderCustomGroups(modelSpecs || [], mappedEndpoints ?? [])}
          </>
        )}
      </Menu>
      <DialogManager
        keyDialogOpen={keyDialogOpen}
        onOpenChange={onOpenChange}
        endpointsConfig={endpointsConfig || {}}
        keyDialogEndpoint={keyDialogEndpoint || undefined}
      />
    </div>
  );
}

export default function ModelSelector({ startupConfig, variant = 'header' }: ModelSelectorProps) {
  const interfaceConfig = startupConfig?.interface ?? defaultInterface;
  const modelSpecs = startupConfig?.modelSpecs?.list ?? [];

  // Hide the selector when modelSelect is false and there are no model specs to show
  if (interfaceConfig.modelSelect === false && modelSpecs.length === 0) {
    return null;
  }

  return (
    <ModelSelectorChatProvider>
      <ModelSelectorProvider startupConfig={startupConfig}>
        <ModelSelectorContent variant={variant} />
      </ModelSelectorProvider>
    </ModelSelectorChatProvider>
  );
}
