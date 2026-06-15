sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/m/MessageBox", "sap/m/MessageToast"],
  function (Controller, MessageBox, MessageToast) {
    "use strict";

    const UPDATE_GROUP_ID = "configChanges";
    const TABLE_BY_TAB_KEY = {
      GeneralConfig: "GeneralConfigTable",
      ExcludedVendors: "ExcludedVendorsTable",
      ExcludedPlants: "ExcludedPlantsTable",
      ExcludedItemCats: "ExcludedItemCatsTable",
      ExcludedPhrases: "ExcludedPhrasesTable",
    };

    return Controller.extend("com.fortescue.lowvalueprtopo.config.controller.App", {
      onAddRow() {
        const table = this._getSelectedTable();
        const binding = table.getBinding("items");
        const context = binding.create({ name: "", descr: "", value: "" });

        context.created().catch(() => {
          // Resetting pending changes rejects transient create contexts.
        });

        MessageToast.show(this._text("rowAdded"));
      },

      onDeleteRows() {
        const table = this._getSelectedTable();
        const contexts = table.getSelectedContexts();

        if (contexts.length === 0) {
          MessageToast.show(this._text("noSelection"));
          return;
        }

        MessageBox.confirm(this._text("deleteConfirmation"), {
          actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.DELETE,
          onClose: async (action) => {
            if (action !== MessageBox.Action.DELETE) {
              return;
            }

            try {
              await Promise.all(
                contexts.map((context) => context.delete(UPDATE_GROUP_ID))
              );
              table.removeSelections(true);
              MessageToast.show(this._text("rowsDeleted"));
            } catch (error) {
              this._showError(error);
            }
          },
        });
      },

      async onSave() {
        const model = this.getView().getModel();

        if (!model.hasPendingChanges(UPDATE_GROUP_ID)) {
          MessageToast.show(this._text("noPendingChanges"));
          return;
        }

        try {
          await model.submitBatch(UPDATE_GROUP_ID);
          if (model.hasPendingChanges(UPDATE_GROUP_ID)) {
            MessageBox.error(this._messageFromError(new Error("Some changes could not be saved.")));
            return;
          }
          MessageToast.show(this._text("changesSaved"));
        } catch (error) {
          this._showError(error);
        }
      },

      onRefresh() {
        const model = this.getView().getModel();

        if (model.hasPendingChanges(UPDATE_GROUP_ID)) {
          model.resetChanges(UPDATE_GROUP_ID);
        }

        const binding = this._getSelectedTable().getBinding("items");
        if (binding) {
          binding.refresh();
        }

        MessageToast.show(this._text("changesReset"));
      },

      _getSelectedTable() {
        const selectedKey = this.byId("configTabs").getSelectedKey();
        return this.byId(TABLE_BY_TAB_KEY[selectedKey]);
      },

      _text(key) {
        return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(key);
      },

      _showError(error) {
        MessageBox.error(this._messageFromError(error));
      },

      _messageFromError(error) {
        return error && error.message ? error.message : String(error);
      },
    });
  }
);
